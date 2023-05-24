import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import "./App.css";
import SendIcon from "@mui/icons-material/Send";
import { DataGrid } from "@mui/x-data-grid";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import Button from "@mui/material/Button";
import { useSpring, animated } from "react-spring";

export default function App() {
  const duration = 1000;

  // its like a list of questions
  const [socket, setSocket] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [questions, setQuestions] = useState([]);
  const drawerAnimation = useSpring({
    from: { transform: "translateX(-100%)" },
    to: { transform: "translateX(0%)" },
    reverse: !drawerOpen, // reverse the animation direction based on the drawer state
    config: { tension: 280, friction: 60 },
  });
  useEffect(() => {
    // Create a new socket connection upon mounting
    const newSocket = io("http://localhost:3001");
    setSocket(newSocket);

    // Cleanup the effect by disconnecting the socket
    return () => newSocket.disconnect();
  }, []);

  useEffect(() => {
    if (!socket) return;

    // Establish event listeners
    socket.on("leaderboard", (data) => {
      console.log("connected to the server");
      setLeaderboard(data);
    });

    socket.on("questions", (data) => {
      console.log("received questions");
      setQuestions(data);
    });

    // Clean up old listeners when socket or questions change
    return () => {
      socket.off("leaderboard");
      socket.off("questions");
    };
  }, [socket, questions]);
  useEffect(() => {
    const checkScrollPosition = () => {
      if (window.pageYOffset > 50) {
        setIsFormVisible(true);
      } else {
        setIsFormVisible(false);
      }
    };

    window.addEventListener("scroll", checkScrollPosition);
    return () => window.removeEventListener("scroll", checkScrollPosition);
  }, []);
  const columns = [
    { field: "id", headerName: "Placement", width: 130 },
    { field: "username", headerName: "Username", width: 130 },
    { field: "score", headerName: "Score", width: 70 },
  ];
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswers, setNewAnswers] = useState([
    { answerText: "", isCorrect: false },
    { answerText: "", isCorrect: false },
    { answerText: "", isCorrect: false },
    { answerText: "", isCorrect: false },
  ]);
  const [newImageURL, setNewImageURL] = useState("");
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [username, setUsername] = useState("");
  const [score, setScore] = useState(0);
  const [showScore, setShowscore] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const handleAnswerButtonClick = (isCorrect) => {
    let newScore = score;
    if (isCorrect === true) {
      newScore = score + 1;
      setScore(newScore);
    }
    const nextQuestion = currentQuestion + 1;
    if (nextQuestion < questions.length) {
      setCurrentQuestion(nextQuestion);
    } else {
      setShowscore(true);
      socket.emit("score", { username: username, score: newScore });
    }
  };
  const handleNewQuestionChange = (e) => {
    setNewQuestion(e.target.value);
  };
  const handleNewAnswerChange = (index, event) => {
    const values = [...newAnswers];
    values[index].answerText = event.target.value;
    setNewAnswers(values);
  };
  const startQuiz = (event) => {
    event.preventDefault();
    setQuizStarted(true);
  };
  const handleCheckboxChange = (index, event) => {
    const values = [...newAnswers];
    values[index].isCorrect = event.target.checked;
    setNewAnswers(values);
  };

  const handleQuestionSubmit = (e) => {
    e.preventDefault();

    // Emit the new question and answers to the server
    socket.emit("new-question", {
      questionText: newQuestion,
      imageURL: newImageURL,
      answerOptions: newAnswers,
    });

    // Clear the inputs
    setNewQuestion("");
    setNewAnswers([
      { answerText: "", isCorrect: false },
      { answerText: "", isCorrect: false },
      { answerText: "", isCorrect: false },
      { answerText: "", isCorrect: false },
    ]);
    setIsFormVisible(false);
  };
  const rows = leaderboard.map((entry, index) => ({
    id: index + 1,
    username: entry.username,
    score: entry.score,
  }));
  return (
    <div className="app">
      <div className="top-bar">
        <div className="quiz-app">Quiz App</div>
        <Button
          variant="outlined"
          sx={{
            color: "rgb(231, 187, 64);",
            borderColor: "rgb(231, 187, 64);",
            fontFamily: "Courier New",
            position: "absolute",
          }}
          className="quiz-question"
          onClick={() => setDrawerOpen(!drawerOpen)}
        >
          {drawerOpen ? "Hide Form" : "Add Question"}
        </Button>
      </div>
      {drawerOpen && (
        <Drawer
          anchor="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          transitionDuration={{ enter: 1000, exit: 1000 }}
          PaperProps={{ style: { backgroundColor: "#1D1E2C" } }}
        >
          <animated.div
            style={{
              ...drawerAnimation,
              backgroundColor: "#1D1E2C",
              color: "#1D1E2C",
              height: "100vh",
              width: "30vh",
            }}
            role="presentation"
          >
            <form onSubmit={handleQuestionSubmit}>
              <input
                className="input-field"
                type="text"
                placeholder="Question"
                value={newQuestion}
                onChange={handleNewQuestionChange}
              />
              {newAnswers.map((newAnswer, i) => (
                <div key={i}>
                  <input
                    className="input-field"
                    type="text"
                    placeholder={`Answer ${i + 1}`}
                    value={newAnswer.answerText}
                    onChange={(event) => handleNewAnswerChange(i, event)}
                  />
                  <label>
                    <input
                      type="checkbox"
                      checked={newAnswer.isCorrect}
                      onChange={(event) => handleCheckboxChange(i, event)}
                    />
                    Is Correct
                  </label>
                </div>
              ))}
              <div>
                <input
                  className="input-field"
                  type="text"
                  placeholder="Image URL"
                  value={newImageURL}
                  onChange={(e) => setNewImageURL(e.target.value)}
                />
                {newImageURL && (
                  <img
                    src={newImageURL}
                    alt="preview"
                    style={{
                      maxWidth: "700px",
                      maxHeight: "200px",
                      width: "auto",
                      height: "auto",
                    }}
                  />
                )}
              </div>
              <Button
                variant="outlined"
                sx={{
                  color: "rgb(231, 187, 64);",
                  borderColor: "rgb(231, 187, 64);",
                  fontFamily: "Courier New",
                  position: "absolute",
                }}
                type="submit"
              >
                Emit Question
              </Button>
            </form>
          </animated.div>
        </Drawer>
      )}
      {!quizStarted ? (
        <form onSubmit={startQuiz}>
          <label>
            Enter your name:
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="name-input-field"
            />
          </label>
          <Button
            sx={{
              color: "rgb(231, 187, 64);",
              borderColor: "rgb(231, 187, 64);",
            }}
            type="submit"
            variant="outlined"
            startIcon={<SendIcon />}
          >
            Start Quiz
          </Button>
        </form>
      ) : showScore ? (
        <>
          <div className="score-section">
            You scored {score} out of {questions.length}
          </div>
          <div className="leaderboard-section">
            <h2>Leaderboard</h2>
            <div style={{ height: 400, width: "100%" }}>
              <Box sx={{ height: 400, width: "100%" }}>
                <DataGrid
                  rows={rows}
                  columns={columns}
                  initialState={{
                    pagination: {
                      paginationModel: {
                        pageSize: 5,
                      },
                    },
                  }}
                  pageSizeOptions={[5]}
                />
              </Box>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="question-section">
            <div className="question-count">
              <span>Question {currentQuestion + 1}</span>/{questions.length}
            </div>
            <div className="question-text">
              {questions[currentQuestion].questionText}
              {questions[currentQuestion].imageURL && (
                <img
                  src={questions[currentQuestion].imageURL}
                  alt="Question"
                  style={{
                    maxWidth: "700px",
                    maxHeight: "200px",
                    width: "auto",
                    height: "auto",
                  }}
                />
              )}
            </div>
          </div>
          <div className="answer-section">
            {questions[currentQuestion].answerOptions.map((answerOption) => (
              <button
                onClick={() => handleAnswerButtonClick(answerOption.isCorrect)}
              >
                {answerOption.answerText}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
