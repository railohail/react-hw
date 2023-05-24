const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");

// Connect to MongoDB all of my schema is connected to here
mongoose.connect("mongodb://localhost/leaderboard", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const questions = [
  {
    questionText: "What is the capital of France?",
    answerOptions: [
      { answerText: "New York", isCorrect: false },
      { answerText: "London", isCorrect: false },
      { answerText: "Paris", isCorrect: true },
      { answerText: "Dublin", isCorrect: false },
    ],
  },
  {
    questionText: "Who is CEO of Tesla?",
    answerOptions: [
      { answerText: "Jeff Bezos", isCorrect: false },
      { answerText: "Elon Musk", isCorrect: true },
      { answerText: "Bill Gates", isCorrect: false },
      { answerText: "Tony Stark", isCorrect: false },
    ],
  },
  {
    questionText: "The iPhone was created by which company?",
    answerOptions: [
      { answerText: "Apple", isCorrect: true },
      { answerText: "Intel", isCorrect: false },
      { answerText: "Amazon", isCorrect: false },
      { answerText: "Microsoft", isCorrect: false },
    ],
  },
  {
    questionText: "How many Harry Potter books are there?",
    answerOptions: [
      { answerText: "1", isCorrect: false },
      { answerText: "4", isCorrect: false },
      { answerText: "6", isCorrect: false },
      { answerText: "7", isCorrect: true },
    ],
  },
];
// Define a schema for your leaderboard
const leaderboardSchema = new mongoose.Schema({
  username: String,
  score: Number,
});

// Create a model from the schema
const Leaderboard = mongoose.model("Leaderboard", leaderboardSchema);

//defining a schema for my questions
//defining a schema for my questions
const questionSchema = new mongoose.Schema({
  questionText: String,
  imageURL: String, // New field for the image URL
  answerOptions: [
    {
      answerText: String,
      isCorrect: Boolean,
    },
  ],
});

const Question = mongoose.model("Question", questionSchema);

async function initializeQuestions() {
  // Check if there are any questions in the database
  const count = await Question.countDocuments();

  // If there aren't, create the questions
  if (count === 0) {
    for (let question of questions) {
      const newQuestion = new Question(question);
      await newQuestion.save();
    }
  }
}

// Call this function when the server starts
initializeQuestions().catch(console.error);

const app = express();
app.use(cors());

const server = http.createServer(app);

// Add CORS configuration to the Socket.IO server
const io = socketIo(server, {
  cors: {
    origin: "*", // Allow all origins
    methods: ["GET", "POST"], // Allow GET and POST requests
  },
});

io.on("connection", (socket) => {
  console.log("New client connected");
  socket.on("new-question", async (data) => {
    try {
      const newQuestion = new Question(data);
      await newQuestion.save();

      const questions = await Question.find();
      console.log("Updated questions: ", questions); // added logging here

      io.emit("questions", questions);
    } catch (error) {
      console.error("Error handling 'new-question' event: ", error);
    }
  });

  // Send the current leaderboard to the client
  Leaderboard.find()
    .sort({ score: -1 })
    .then((leaderboard) => {
      socket.emit("leaderboard", leaderboard);
    });
  Question.find().then((questions) => {
    socket.emit("questions", questions);
  });

  // Handle score updates from the client
  socket.on("score", async (data) => {
    const { username, score } = data;
    const newScore = new Leaderboard({ username, score });
    await newScore.save();

    // Send the updated leaderboard to all clients
    const leaderboard = await Leaderboard.find().sort({ score: -1 });
    io.emit("leaderboard", leaderboard);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

server.listen(3001, () => console.log("Server running on port 3001"));
