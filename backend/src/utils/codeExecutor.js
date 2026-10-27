const { exec, execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate a unique temp file path.
 * Using Date.now() + random suffix prevents collisions between concurrent executions.
 */
const tmpPath = (prefix, ext) =>
  path.join(
    os.tmpdir(),
    `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
  );

/**
 * Safely delete a file — swallows errors (file may already be gone).
 * Called in all code paths: success, timeout, and error.
 */
const cleanup = (...files) => {
  for (const f of files) {
    if (!f) continue;
    try {
      fs.unlinkSync(f);
    } catch (_) {
      // File already deleted or never created — safe to ignore
    }
  }
};

/**
 * Resolve the correct Python binary name for the OS.
 * - Linux (Docker): python3  (python3 is default; we create a 'python' symlink in Dockerfile)
 * - Windows (dev):  python
 * We try python3 first, fallback to python if the command isn't found.
 */
const PYTHON_CMD = process.platform === "win32" ? "python" : "python3";

let nodePermissionSupportPromise = null;

const supportsNodePermissionSandbox = () => {
  if (!nodePermissionSupportPromise) {
    nodePermissionSupportPromise = new Promise((resolve) => {
      execFile(
        "node",
        ["--experimental-permission", "-e", ""],
        { timeout: 2000 },
        (err) => resolve(!err)
      );
    });
  }
  return nodePermissionSupportPromise;
};

// ─── JavaScript Executor ───────────────────────────────────────────────────────

/**
 * Executes JavaScript code in an isolated child Node.js process.
 *
 * Security fixes applied:
 *  1. --experimental-permission flag restricts fs access to /tmp only.
 *     This prevents user code from reading /etc/passwd, process.env files,
 *     or any server file outside the temp directory.
 *  2. --allow-fs-read is limited to os.tmpdir() — only the sandbox temp area.
 *  3. Child process spawning (child_process module) is blocked by default
 *     when --experimental-permission is active without --allow-child-process.
 *  4. Stdin is injected via monkey-patching fs.readFileSync(0) inside the
 *     child process — this stays within the allowed /tmp read path.
 *  5. SIGKILL on timeout — cannot be caught by user code (unlike SIGTERM).
 *  6. 128MB heap cap via --max-old-space-size.
 *
 * NOTE: Network access cannot yet be blocked via Node's permission model (v22).
 * A production hardening would wrap this in Docker with --network=none.
 */
const executeJS = async (code, input, timeoutMs = 3000) => {
  const canUsePermissionSandbox = await supportsNodePermissionSandbox();
  if (!canUsePermissionSandbox) {
    return {
      success: false,
      output: "",
      executionTime: 0,
      error:
        "Local JavaScript fallback is disabled because this Node.js runtime does not support the required permission sandbox flag.",
    };
  }

  return new Promise((resolve) => {
    const scriptFile = tmpPath("codedraft_js", "js");
    const tmpDir = os.tmpdir();

    // Wrap user code: inject stdin via monkey-patch so fs.readFileSync(0) works
    // without the child needing access to /dev/stdin
    const wrappedCode = `
const fs = require('fs');
const _origReadFileSync = fs.readFileSync;
fs.readFileSync = function(fd, options) {
  if (fd === 0 || fd === '/dev/stdin') {
    return ${JSON.stringify(input || "")};
  }
  return _origReadFileSync.apply(this, arguments);
};
try {
  ${code}
} catch (err) {
  console.error(err.stack || err.message);
  process.exit(1);
}
`;

    try {
      fs.writeFileSync(scriptFile, wrappedCode, "utf-8");
      const startTime = Date.now();

      // --experimental-permission: restrict fs reads to /tmp only
      // This blocks: require('fs').readFileSync('/etc/passwd'), process.env leaks via file reads, etc.
      // --allow-child-process is intentionally NOT passed → blocks exec/spawn inside user code
      exec(
        `node --experimental-permission --allow-fs-read="${tmpDir}" --max-old-space-size=128 "${scriptFile}"`,
        { timeout: timeoutMs, killSignal: "SIGKILL" },
        (err, stdout, stderr) => {
          const executionTime = Date.now() - startTime;
          cleanup(scriptFile); // ← always cleaned up here

          if (err && err.killed) {
            return resolve({
              success: false,
              output: "",
              executionTime: 0,
              error: `Time limit exceeded. Execution timed out after ${timeoutMs}ms.`,
            });
          }

          resolve({
            success: !err,
            output: (stdout || "").trim(),
            executionTime,
            error: stderr ? stderr.trim() : err ? err.message : null,
          });
        }
      );
    } catch (e) {
      // writeFileSync or exec() itself threw synchronously
      cleanup(scriptFile);
      resolve({
        success: false,
        output: "",
        executionTime: 0,
        error: e.message,
      });
    }
  });
};

// ─── Python Executor ──────────────────────────────────────────────────────────

/**
 * Executes Python 3 code.
 * Uses python3 on Linux/Docker (installed in Dockerfile), python on Windows.
 * Input is fed via a separate temp file piped to stdin — no monkey-patching needed.
 *
 * FIX: Changed from hardcoded "python" to PYTHON_CMD constant.
 * On Render/Docker (Linux), "python" doesn't exist by default — "python3" does.
 * The Dockerfile creates a symlink: python → python3, so both work.
 * This constant ensures the correct command is used on both dev (Windows) and prod (Linux).
 */
const executePython = (code, input, timeoutMs = 10000) => {
  return new Promise((resolve) => {
    const scriptFile = tmpPath("codedraft_py", "py");
    const inputFile = tmpPath("codedraft_in", "txt");

    try {
      fs.writeFileSync(scriptFile, code, "utf-8");
      fs.writeFileSync(inputFile, input || "", "utf-8");

      const startTime = Date.now();

      exec(
        `${PYTHON_CMD} "${scriptFile}" < "${inputFile}"`,
        { timeout: timeoutMs, killSignal: "SIGKILL" },
        (err, stdout, stderr) => {
          const executionTime = Date.now() - startTime;
          cleanup(scriptFile, inputFile); // ← always cleaned up

          if (err && err.killed) {
            return resolve({
              success: false,
              output: "",
              executionTime: 0,
              error: `Time limit exceeded. Execution timed out after ${timeoutMs}ms.`,
            });
          }

          resolve({
            success: !err,
            output: (stdout || "").trim(),
            executionTime,
            error: stderr ? stderr.trim() : err ? err.message : null,
          });
        }
      );
    } catch (e) {
      cleanup(scriptFile, inputFile);
      resolve({
        success: false,
        output: "",
        executionTime: 0,
        error: e.message,
      });
    }
  });
};

// ─── C++ Executor ────────────────────────────────────────────────────────────

/**
 * Compiles and executes C++ code using g++.
 * Two-phase: compile (15s timeout) → execute (timeoutMs timeout).
 * Compile errors are returned directly as the error message.
 * All temp files (source, binary, input) are cleaned up after execution.
 *
 * g++ is installed in Dockerfile via apt-get install g++
 */
const executeCPP = (code, input, timeoutMs = 10000) => {
  return new Promise((resolve) => {
    const base = tmpPath("codedraft_cpp", "tmp").replace(/\.tmp$/, "");
    const cppFile = `${base}.cpp`;
    const exeFile = `${base}.exe`;
    const inputFile = `${base}_in.txt`;

    try {
      fs.writeFileSync(cppFile, code, "utf-8");
      fs.writeFileSync(inputFile, input || "", "utf-8");

      // Phase 1: Compile
      exec(
        `g++ -O2 -std=c++17 "${cppFile}" -o "${exeFile}"`,
        { timeout: 15000 },
        (compileErr, _compileStdout, compileStderr) => {
          if (compileErr) {
            cleanup(cppFile, inputFile, exeFile);
            return resolve({
              success: false,
              output: "",
              executionTime: 0,
              error: compileStderr
                ? compileStderr.trim()
                : compileErr.message,
            });
          }

          // Phase 2: Execute compiled binary
          const startTime = Date.now();
          exec(
            `"${exeFile}" < "${inputFile}"`,
            { timeout: timeoutMs, killSignal: "SIGKILL" },
            (runErr, stdout, stderr) => {
              const executionTime = Date.now() - startTime;
              cleanup(cppFile, exeFile, inputFile); // ← all three cleaned up

              if (runErr && runErr.killed) {
                return resolve({
                  success: false,
                  output: "",
                  executionTime: 0,
                  error: `Time limit exceeded. Execution timed out after ${timeoutMs}ms.`,
                });
              }

              resolve({
                success: !runErr,
                output: (stdout || "").trim(),
                executionTime,
                error: stderr
                  ? stderr.trim()
                  : runErr
                  ? runErr.message
                  : null,
              });
            }
          );
        }
      );
    } catch (e) {
      cleanup(cppFile, exeFile, inputFile);
      resolve({
        success: false,
        output: "",
        executionTime: 0,
        error: e.message,
      });
    }
  });
};

// ─── C Executor ───────────────────────────────────────────────────────────────

/**
 * Compiles and executes C code using gcc.
 * Same two-phase pattern as C++.
 * gcc is installed in Dockerfile via apt-get install gcc
 */
const executeC = (code, input, timeoutMs = 10000) => {
  return new Promise((resolve) => {
    const base = tmpPath("codedraft_c", "tmp").replace(/\.tmp$/, "");
    const cFile = `${base}.c`;
    const exeFile = `${base}.exe`;
    const inputFile = `${base}_in.txt`;

    try {
      fs.writeFileSync(cFile, code, "utf-8");
      fs.writeFileSync(inputFile, input || "", "utf-8");

      // Phase 1: Compile
      exec(
        `gcc -O2 "${cFile}" -o "${exeFile}"`,
        { timeout: 15000 },
        (compileErr, _compileStdout, compileStderr) => {
          if (compileErr) {
            cleanup(cFile, inputFile, exeFile);
            return resolve({
              success: false,
              output: "",
              executionTime: 0,
              error: compileStderr
                ? compileStderr.trim()
                : compileErr.message,
            });
          }

          // Phase 2: Execute compiled binary
          const startTime = Date.now();
          exec(
            `"${exeFile}" < "${inputFile}"`,
            { timeout: timeoutMs, killSignal: "SIGKILL" },
            (runErr, stdout, stderr) => {
              const executionTime = Date.now() - startTime;
              cleanup(cFile, exeFile, inputFile); // ← all three cleaned up

              if (runErr && runErr.killed) {
                return resolve({
                  success: false,
                  output: "",
                  executionTime: 0,
                  error: `Time limit exceeded. Execution timed out after ${timeoutMs}ms.`,
                });
              }

              resolve({
                success: !runErr,
                output: (stdout || "").trim(),
                executionTime,
                error: stderr
                  ? stderr.trim()
                  : runErr
                  ? runErr.message
                  : null,
              });
            }
          );
        }
      );
    } catch (e) {
      cleanup(cFile, exeFile, inputFile);
      resolve({
        success: false,
        output: "",
        executionTime: 0,
        error: e.message,
      });
    }
  });
};

module.exports = {
  executeJS,
  executePython,
  executeCPP,
  executeC,
  supportsNodePermissionSandbox,
};
