const express = require("express");
const router = express.Router();

const MessageController = require("../controllers/MessageController");
const { isAuthenticated, isCandidate, isRecruiter } = require("../middlewares/auth");

router.get(
  "/recruiter/conversations",
  isAuthenticated,
  isRecruiter,
  MessageController.getRecruiterConversations
);

router.get(
  "/candidate/conversations",
  isAuthenticated,
  isCandidate,
  MessageController.getCandidateConversations
);

router.post(
  "/conversations/job",
  isAuthenticated,
  MessageController.getOrCreateJobConversation
);

module.exports = router;
