import React, { useState, useRef } from 'react';
import './App.css';

// Hjälpfunktioner för normalisering och cirkulär skillnad
function normalize(angle) {
  return ((angle % 360) + 360) % 360;
}
function circularDifference(a, b) {
  const diff = Math.abs(a - b);
  return Math.min(diff, 360 - diff);
}

function App() {
  // Nivå (1 till 4) – startar på 1
  const [level, setLevel] = useState(1);
  // currentTime: hour (flyttal) och minute (heltal)
  const [currentTime, setCurrentTime] = useState({ hour: 3, minute: 0 });
  // dragging: "minute" eller "hour"
  const [dragging, setDragging] = useState(null);
  // Feedback
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState("");
  // Mål-tid som sträng "HH:MM"
  const [targetTime, setTargetTime] = useState(generateTargetTime(1));
  // Antal stjärnor
  const [stars, setStars] = useState(0);
  // Tolerans (grader)
  const tolerance = 10;
  
  const clockRef = useRef(null);
  
  // Beräkna visarnas vinklar från currentTime
  const minuteAngle = currentTime.minute * 6;
  const hourAngle = ((currentTime.hour % 12) * 30) + ((currentTime.minute / 60) * 30);
  
  // Generera en slumpmässig tid beroende på nivå
  function generateTargetTime(level) {
    const hour = Math.floor(Math.random() * 12) + 1;
    let minute = 0;
    if (level === 1) {
      minute = 0;
    } else if (level === 2) {
      minute = 30;
    } else if (level === 3) {
      const options = [0, 15, 30, 45];
      minute = options[Math.floor(Math.random() * options.length)];
    } else {
      const options = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
      minute = options[Math.floor(Math.random() * options.length)];
    }
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }
  
  // Beräkna förväntade vinklar utifrån mål-tiden
  function getExpectedAngles(timeStr) {
    const [hourStr, minuteStr] = timeStr.split(':');
    const targetHour = Number(hourStr);
    const targetMinute = Number(minuteStr);
    const expectedMinuteAngle = targetMinute * 6;
    const expectedHourAngle = ((targetHour % 12) * 30) + ((targetMinute / 60) * 30);
    return { expectedHourAngle, expectedMinuteAngle };
  }
  
  // Kontrollera svaret
  function checkAnswer() {
    const { expectedHourAngle, expectedMinuteAngle } = getExpectedAngles(targetTime);
    const diffHour = circularDifference(normalize(hourAngle), normalize(expectedHourAngle));
    const diffMinute = circularDifference(normalize(minuteAngle), normalize(expectedMinuteAngle));
    
    if (diffHour <= tolerance && diffMinute <= tolerance) {
      setFeedback("Rätt! Bra jobbat!");
      setFeedbackType("success");
      setStars(prev => prev + 1);
      setTimeout(() => setFeedback(""), 2000);
      setTargetTime(generateTargetTime(level));
      setCurrentTime({ hour: 3, minute: 0 });
    } else {
      setFeedback("Försök igen!");
      setFeedbackType("error");
      setTimeout(() => setFeedback(""), 2000);
    }
  }
  
  // Hantera nivåval
  function handleLevelSelect(newLevel) {
    setLevel(newLevel);
    setTargetTime(generateTargetTime(newLevel));
    setCurrentTime({ hour: 3, minute: 0 });
  }
  
  // Hjälpfunktion: konvertera vinkel till minut (utan snäppning under drag)
  function angleToMinute(angle) {
    return angle / 6;
  }
  
  // Hantera mus-/pekrörelser
  function handleMouseMove(e) {
    if (!dragging) return;
    const rect = clockRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    angle += 90;
    if (angle < 0) angle += 360;
    
    if (dragging === "minute") {
      const newMinute = angleToMinute(angle);
      setCurrentTime(prev => ({ ...prev, minute: newMinute }));
    } else if (dragging === "hour") {
      let newHour = (angle - ((currentTime.minute / 60) * 30)) / 30;
      if (level === 1) {
        newHour = Math.round(newHour);
      } else if (level === 2) {
        newHour = Math.round(newHour * 2) / 2;
      }
      setCurrentTime(prev => ({ ...prev, hour: newHour }));
    }
  }
  
  function handleMouseDown(hand) {
    setDragging(hand);
  }
  
  // Vid släpp, snäpp minutvisaren till närmaste 5-minutersintervall samt timvisaren beroende på nivå
  function handleMouseUp() {
    if (dragging === "minute") {
      setCurrentTime(prev => ({
        ...prev,
        minute: Math.round(prev.minute / 5) * 5
      }));
    } else if (dragging === "hour") {
      if (level === 1) {
        setCurrentTime(prev => ({ ...prev, hour: Math.round(prev.hour) }));
      } else if (level === 2) {
        setCurrentTime(prev => ({ ...prev, hour: Math.round(prev.hour * 2) / 2 }));
      }
    }
    setDragging(null);
  }
  
  // Ritar siffrorna runt klockans mitt.
  // OBS! Sänkt 'radius' till 100 (eller 80) så att siffrorna inte hamnar utanför på små skärmar.
  function renderNumbers() {
    const numbers = Array.from({ length: 12 }, (_, i) => i + 1);
    const radius = 130; // Justera om siffrorna hamnar för nära mitten eller kanten
    return numbers.map(num => {
      const angleDeg = num * 30 - 90;
      const angleRad = (angleDeg * Math.PI) / 180;
      const x = radius * Math.cos(angleRad);
      const y = radius * Math.sin(angleRad);
      return (
        <div
          key={num}
          className="clock-number"
          style={{
            left: "50%",
            top: "50%",
            transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`
          }}
        >
          {num}
        </div>
      );
    });
  }
  
  return (
    <div className="App" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      <div className="header">
        <div className="title">Lär dig klockan</div>
      </div>
      
      <div className="level-selector">
        <button onClick={() => handleLevelSelect(1)} className={level === 1 ? "active" : ""}>Nivå 1</button>
        <button onClick={() => handleLevelSelect(2)} className={level === 2 ? "active" : ""}>Nivå 2</button>
        <button onClick={() => handleLevelSelect(3)} className={level === 3 ? "active" : ""}>Nivå 3</button>
        <button onClick={() => handleLevelSelect(4)} className={level === 4 ? "active" : ""}>Nivå 4</button>
      </div>
      
      <div className="clock-container" ref={clockRef}>
        {renderNumbers()}
        <div
          className="hour-hand"
          style={{ transform: `translate(-50%, -100%) rotate(${hourAngle}deg)` }}
          onMouseDown={() => handleMouseDown("hour")}
        />
        <div
          className="minute-hand"
          style={{ transform: `translate(-50%, -100%) rotate(${minuteAngle}deg)` }}
          onMouseDown={() => handleMouseDown("minute")}
        />
        {feedback && (
          <div className={`feedback ${feedbackType}`}>
            {feedback}
          </div>
        )}
      </div>
      
      <div className="target-time">Mål: {targetTime}</div>
      <button className="confirm-button" onClick={checkAnswer}>Bekräfta</button>
      
      <div className="star-counter">
        {Array.from({ length: stars }, (_, i) => (
          <span key={i} role="img" aria-label="star">⭐</span>
        ))}
      </div>
    </div>
  );
}

export default App;
