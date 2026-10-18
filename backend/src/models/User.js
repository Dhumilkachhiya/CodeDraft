const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    eloRating: { type: Number, default: 1000, index: true },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    draws: { type: Number, default: 0 },
    matchesPlayed: { type: Number, default: 0 },

    // Academic profile
    college: { type: String, trim: true, default: "", index: true },
    degree: { type: String, trim: true, default: "" },
    year: { type: String, trim: true, default: "" },
    bio: { type: String, trim: true, default: "", maxlength: 200 },

    // College verification
    collegeEmail: { type: String, trim: true, default: "" },
    collegeVerified: { type: Boolean, default: false },

    avatar: { type: String, default: "" },

    // Friends system
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    friendRequests: [
      {
        from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        status: {
          type: String,
          enum: ["pending", "accepted", "rejected"],
          default: "pending",
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    eloHistory: [
      {
        eloRating: { type: Number },
        roomId: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

userSchema.index({ eloRating: -1, wins: -1 });
userSchema.index({ college: 1, eloRating: -1 });

userSchema.pre("save", async function (next) {
  if (!this.isModified("passwordHash")) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, SALT_ROUNDS);
  next();
});

userSchema.pre("save", function (next) {
  if (!this.avatar && this.username) {
    this.avatar = this.username.slice(0, 2).toUpperCase();
  }
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.methods.toPublicJSON = function () {
  return {
    _id: this._id,
    username: this.username,
    email: this.email,
    eloRating: this.eloRating,
    wins: this.wins,
    losses: this.losses,
    draws: this.draws,
    matchesPlayed: this.matchesPlayed,
    college: this.college,
    degree: this.degree,
    year: this.year,
    bio: this.bio,
    collegeEmail: this.collegeEmail,
    collegeVerified: this.collegeVerified,
    avatar: this.avatar,
    createdAt: this.createdAt,
  };
};

const User = mongoose.model("User", userSchema);
module.exports = User;
