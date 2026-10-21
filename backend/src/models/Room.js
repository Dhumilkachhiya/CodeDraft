const mongoose = require("mongoose");

const problemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  statement: {
    type: String,
    required: true,
  },
  visibleExamples: [
    {
      input: { type: String, required: true },
      output: { type: String, required: true },
      explanation: { type: String, default: "" },
    },
  ],
  hiddenTestCases: [
    {
      input: { type: String, required: true },
      expectedOutput: { type: String, required: true },
    },
  ],
  timeLimit: {
    type: Number,
    required: true,
    default: 10,
  },
  difficulty: {
    type: String,
    enum: ["easy", "medium", "hard"],
    required: true,
  },
  allowedLanguages: [String],
  validatedAt: {
    type: Date,
    default: Date.now,
  },
});

const roomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 6,
      maxlength: 6,
      index: true,
    },
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    creatorCompeting: {
      type: Boolean,
      default: false,
    },
    battleFormat: {
      type: String,
      enum: ["1v1", "2v2"],
      default: "1v1",
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    isBlitz: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["setting_up", "waiting_for_players", "active", "finished", "expired"],
      default: "setting_up",
      index: true,
    },
    problem: problemSchema,
    problemA: problemSchema,
    problemB: problemSchema,
    players: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    teamA: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    teamB: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    spectatorCount: {
      type: Number,
      default: 0,
    },
    setupExpiresAt: {
      type: Date,
    },
    startedAt: {
      type: Date,
    },
    finishedAt: {
      type: Date,
    },
    winnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    winningTeam: {
      type: String,
      enum: ["A", "B"],
    },
    submissions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        submittedAt: {
          type: Date,
          required: true,
          default: Date.now,
        },
        testCasesPassed: {
          type: Number,
          required: true,
        },
        totalTestCases: {
          type: Number,
          required: true,
        },
        language: {
          type: String,
          required: true,
        },
        executionTime: {
          type: Number,
        },
      },
    ],
    eloChanges: {
      type: Map,
      of: Number,
      default: {},
    },
    eventTimeline: [
      {
        eventType: {
          type: String,
          required: true,
        },
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        payload: {
          type: mongoose.Schema.Types.Mixed,
        },
        timestamp: {
          type: Date,
          required: true,
          default: Date.now,
        },
      },
    ],
    problemRatings: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        rating: {
          type: Number,
          required: true,
          min: 1,
          max: 5,
        },
      },
    ],
    playerLanguages: {
      type: Map,
      of: String,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

roomSchema.index({ players: 1, status: 1, finishedAt: -1 });
roomSchema.index({ creatorId: 1, status: 1 });
roomSchema.index({ status: 1, isPublic: 1, createdAt: -1 });

module.exports = mongoose.model("Room", roomSchema);
