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

// Hjälpfunktion för att konvertera tid (HH:MM) till svensk text
function formatSwedishTime(timeStr) {
  const [hourStr, minuteStr] = timeStr.split(':');
  let hour = parseInt(hourStr, 10);
  let minute = parseInt(minuteStr, 10);
  
  const hourWords = {
    1: "ett",
    2: "två",
    3: "tre",
    4: "fyra",
    5: "fem",
    6: "sex",
    7: "sju",
    8: "åtta",
    9: "nio",
    10: "tio",
    11: "elva",
    12: "tolv"
  };
  
  if (minute === 0) {
    return `klockan ${hourWords[hour]}`;
  } else if (minute === 15) {
    return `kvart över ${hourWords[hour]}`;
  } else if (minute === 30) {
    let nextHour = (hour % 12) + 1;
    return `halv ${hourWords[nextHour]}`;
  } else if (minute === 45) {
    let nextHour = (hour % 12) + 1;
    return `kvart i ${hourWords[nextHour]}`;
  }
  return timeStr;
}

function App() {
  // Nivå (1 till 4) – startar på 1
  const [level, setLevel] = useState(1);
  // currentTime: hour (1-12) och minute (heltal)
  const [currentTime, setCurrentTime] = useState({ hour: 3, minute: 0 });
  // dragging: "minute" eller "hour"
  const [dragging, setDragging] = useState(null);
  // Feedback och feedbackType
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState("");
  // Mål-tid som sträng "HH:MM"
  const [targetTime, setTargetTime] = useState(generateTargetTime(1));
  // Antal stjärnor
  const [stars, setStars] = useState(0);
  // Tolerans (grader)
  const tolerance = 10;
  
  const clockRef = useRef(null);
  // Refs för minutdragning vid nivå 3 och 4
  const minuteDragStartRef = useRef(0);
  const dragStartAngleRef = useRef(0);
  
  // AudioRefs för ljudeffekter
  const correctAudioRef = useRef(null);
  const wrongAudioRef = useRef(null);
  
  // Beräkna visarnas vinklar utifrån currentTime
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
  
  // Kontrollera svaret och spela upp ljudeffekter
  function checkAnswer() {
    const { expectedHourAngle, expectedMinuteAngle } = getExpectedAngles(targetTime);
    const diffHour = circularDifference(normalize(hourAngle), normalize(expectedHourAngle));
    const diffMinute = circularDifference(normalize(minuteAngle), normalize(expectedMinuteAngle));
    
    if (diffHour <= tolerance && diffMinute <= tolerance) {
      // Spela upp rätt ljud
      if (correctAudioRef.current) {
        correctAudioRef.current.play();
      }
      setFeedback("Rätt! Bra jobbat!");
      setFeedbackType("success");
      setStars(prev => prev + 1);
      setTimeout(() => setFeedback(""), 2000);
      setTargetTime(generateTargetTime(level));
      setCurrentTime({ hour: 3, minute: 0 });
    } else {
      // Spela upp fel ljud
      if (wrongAudioRef.current) {
        wrongAudioRef.current.play();
      }
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
  
  // Hjälpfunktion: konvertera vinkel till minut (för nivå 1 och 2)
  function angleToMinute(angle) {
    return angle / 6;
  }
  
  // Hantera rörelse (mus och touch)
  function handleMouseMove(e) {
    if (!dragging) return;
    
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      e.preventDefault();
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const rect = clockRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    angle += 90;
    if (angle < 0) angle += 360;
    
    if (dragging === "minute") {
      if (level === 3 || level === 4) {
        let deltaAngle = angle - dragStartAngleRef.current;
        if (deltaAngle > 180) deltaAngle -= 360;
        if (deltaAngle < -180) deltaAngle += 360;
        const deltaMinutes = deltaAngle / 6;
        let total = minuteDragStartRef.current + deltaMinutes;
        total = ((total % 720) + 720) % 720;
        let newHour = Math.floor(total / 60) % 12;
        newHour = newHour === 0 ? 12 : newHour;
        const newMinute = Math.round(total % 60);
        setCurrentTime({ hour: newHour, minute: newMinute });
      } else {
        const newMinute = angleToMinute(angle);
        setCurrentTime(prev => ({ ...prev, minute: newMinute }));
      }
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
  
  // Modifierad handleMouseDown för att spara startläget vid minutdragning
  function handleMouseDown(hand, e) {
    setDragging(hand);
    if (hand === "minute" && (level === 3 || level === 4)) {
      let clientX, clientY;
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      const rect = clockRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      let startAngle = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
      startAngle += 90;
      if(startAngle < 0) startAngle += 360;
      dragStartAngleRef.current = startAngle;
      minuteDragStartRef.current = ((currentTime.hour % 12) * 60) + currentTime.minute;
    }
  }
  
  // Vid släpp snäpps tiden beroende på nivå
  function handleMouseUp() {
    if (dragging === "minute") {
      if (level === 1) {
        setCurrentTime(prev => ({ ...prev, minute: 0 }));
      } else if (level === 2) {
        setCurrentTime(prev => ({ ...prev, minute: 30 }));
      } else if (level === 3) {
        setCurrentTime(prev => {
          const total = ((prev.hour % 12) * 60) + prev.minute;
          const snapped = Math.round(total / 15) * 15;
          const norm = ((snapped % 720) + 720) % 720;
          let newHour = Math.floor(norm / 60) % 12;
          newHour = newHour === 0 ? 12 : newHour;
          const newMinute = norm % 60;
          return { hour: newHour, minute: newMinute };
        });
      } else if (level === 4) {
        setCurrentTime(prev => {
          const total = ((prev.hour % 12) * 60) + prev.minute;
          const snapped = Math.round(total / 5) * 5;
          const norm = ((snapped % 720) + 720) % 720;
          let newHour = Math.floor(norm / 60) % 12;
          newHour = newHour === 0 ? 12 : newHour;
          const newMinute = norm % 60;
          return { hour: newHour, minute: newMinute };
        });
      }
    } else if (dragging === "hour") {
      if (level === 1) {
        setCurrentTime(prev => ({ ...prev, hour: Math.round(prev.hour) }));
      } else if (level === 2) {
        setCurrentTime(prev => ({ ...prev, hour: Math.round(prev.hour * 2) / 2 }));
      }
    }
    setDragging(null);
  }
  
  function renderNumbers() {
    const numbers = Array.from({ length: 12 }, (_, i) => i + 1);
    const radius = 100;
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
    <div className="App"
         onMouseMove={handleMouseMove}
         onTouchMove={handleMouseMove}
         onMouseUp={handleMouseUp}
         onTouchEnd={handleMouseUp}>
      <div className="header">
        <div className="title">Lär dig klockan</div>
      </div>
      
      <div className="level-selector">
        <button onClick={() => handleLevelSelect(1)} className={level === 1 ? "active" : ""}>Lätt</button>
        <button onClick={() => handleLevelSelect(2)} className={level === 2 ? "active" : ""}>Svår</button>
        <button onClick={() => handleLevelSelect(3)} className={level === 3 ? "active" : ""}>Svårare</button>
        <button onClick={() => handleLevelSelect(4)} className={level === 4 ? "active" : ""}>Svårast</button>
      </div>
      
      <div className="clock-container" ref={clockRef}>
        {renderNumbers()}
        <div
          className="hour-hand"
          style={{ transform: `translate(-50%, -100%) rotate(${hourAngle}deg)` }}
          onMouseDown={(e) => handleMouseDown("hour", e)}
          onTouchStart={(e) => handleMouseDown("hour", e)}
        />
        <div
          className="minute-hand"
          style={{ transform: `translate(-50%, -100%) rotate(${minuteAngle}deg)` }}
          onMouseDown={(e) => handleMouseDown("minute", e)}
          onTouchStart={(e) => handleMouseDown("minute", e)}
        />
        {feedback && (
          <div className={`feedback ${feedbackType}`}>
            {feedback}
          </div>
        )}
      </div>
      
      <div className="target-time">
        {formatSwedishTime(targetTime)} ({targetTime})
      </div>
      <button className="confirm-button" onClick={checkAnswer}>Rätta!</button>
      
      <div className="star-counter">
        {Array.from({ length: stars }, (_, i) => (
          <span key={i} role="img" aria-label="star">⭐</span>
        ))}
      </div>
      
      {/* Ljudspelare för ljudeffekter */}
      <audio ref={correctAudioRef} src="/sounds/correct.mp3" />
      <audio ref={wrongAudioRef} src="/sounds/wrong.mp3" />
    </div>
  );
}

export default App;
