const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Submission = require("../src/models/Submission");

test("creates a valid queued submission document", () => {
  const submission = new Submission({
    requestId: "request-1",
    roomId: "ABC123",
    userId: new mongoose.Types.ObjectId(),
    language: "javascript",
    sourceCode: "console.log('ok')",
  });

  const error = submission.validateSync();
  assert.equal(error, undefined);
  assert.equal(submission.status, "queued");
  assert.equal(submission.attempts, 0);
  assert.ok(submission.expiresAt > new Date());
});

test("rejects a submission without required execution data", () => {
  const submission = new Submission({ requestId: "request-2" });
  const error = submission.validateSync();

  assert.ok(error.errors.roomId);
  assert.ok(error.errors.userId);
  assert.ok(error.errors.language);
  assert.ok(error.errors.sourceCode);
});
