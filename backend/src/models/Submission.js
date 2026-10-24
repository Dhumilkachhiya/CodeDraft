const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
    },
    roomId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    language: {
      type: String,
      required: true,
    },
    sourceCode: {
      type: String,
      required: true,
      select: false,
    },
    status: {
      type: String,
      enum: ["queued", "processing", "completed", "failed", "cancelled"],
      default: "queued",
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    results: [
      {
        passed: { type: Boolean, required: true },
      },
    ],
    allPassed: {
      type: Boolean,
      default: false,
    },
    winnerClaimed: {
      type: Boolean,
      default: false,
    },
    error: {
      type: String,
      default: "",
    },
    startedAt: Date,
    completedAt: Date,
    expiresAt: {
      type: Date,
      default: () =>
        new Date(
          Date.now() +
            (Number(process.env.SUBMISSION_RETENTION_SECONDS) || 604800) * 1000
        ),
    },
  },
  { timestamps: true }
);

submissionSchema.index({ roomId: 1, userId: 1, requestId: 1 }, { unique: true });
submissionSchema.index({ userId: 1, createdAt: -1 });
submissionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Submission", submissionSchema);
