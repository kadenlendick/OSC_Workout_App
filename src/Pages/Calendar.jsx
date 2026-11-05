import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, getLoginEntries } from '../Utils/streak';
import './Calendar.css';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getMonthLabel(year, month) {
  return new Date(year, month, 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });
}

function toDayKey(year, month, day) {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function buildMonthCells(year, month) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push({ type: 'empty', key: `empty-start-${i}` });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      type: 'day',
      key: toDayKey(year, month, day),
      day,
      dateKey: toDayKey(year, month, day),
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ type: 'empty', key: `empty-end-${cells.length}` });
  }

  return cells;
}

function getSavedSessionDates() {
  const storageKey = 'savedSessions';
  const rawValue = localStorage.getItem(storageKey);
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);
    const candidates = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.sessions)
        ? parsed.sessions
        : Array.isArray(parsed?.dates)
          ? parsed.dates
          : Object.values(parsed ?? {});

    return candidates
      .flatMap((entry) => {
        if (typeof entry === 'string') return [entry];
        if (!entry || typeof entry !== 'object') return [];
        if (typeof entry.dateKey === 'string') return [entry.dateKey];
        if (typeof entry.date === 'string') return [entry.date];
        if (Array.isArray(entry.dates)) return entry.dates;
        return [];
      })
      .filter((dateKey) => typeof dateKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateKey));
  } catch (error) {
    return [];
  }
}

function Calendar() {
  const navigate = useNavigate();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);

  const user = getCurrentUser();
  const loginEntries = useMemo(() => (user ? getLoginEntries(user) : []), [user]);
  const savedSessionDates = useMemo(() => getSavedSessionDates(), []);

  const workoutDays = useMemo(() => {
    return new Set([...loginEntries, ...savedSessionDates]);
  }, [loginEntries, savedSessionDates]);

  const cells = useMemo(
    () => buildMonthCells(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const todayKey = toDayKey(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  function goPrevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goNextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function handleDayClick(dateKey, day) {
    setSelectedDay(dateKey);
    console.log('Calendar day clicked:', { dateKey, day });
  }

  const touchStartX = useRef(null);

  function handleTouchStart(event) {
    const touch = event.touches[0];
    touchStartX.current = touch.clientX;
  }

  function handleTouchEnd(event) {
    if (touchStartX.current === null) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX.current;
    touchStartX.current = null;

    if (Math.abs(deltaX) < 50) return;

    if (deltaX > 0) {
      goPrevMonth();
    } else {
      goNextMonth();
    }
  }

  return (
    <div className="calendar-root">
      <header className="calendar-header">
        <button
          type="button"
          className="calendar-back"
          onClick={() => navigate('/')}
        >
          ← Home
        </button>
        <h1 className="neon-title text">Calendar</h1>
        <p className="neon-subtitle text">See which days you locked in</p>
      </header>

      <main className="calendar-main">
        <div className="calendar-controls">
          <button
            type="button"
            className="month-nav-btn neon-blue"
            onClick={goPrevMonth}
            aria-label="Previous month"
          >
            ‹
          </button>
          <h2 className="month-label text">{getMonthLabel(viewYear, viewMonth)}</h2>
          <button
            type="button"
            className="month-nav-btn neon-blue"
            onClick={goNextMonth}
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        <div className="weekday-row">
          {WEEKDAYS.map((label) => (
            <div key={label} className="weekday-label text">
              {label}
            </div>
          ))}
        </div>

        <div
          className="calendar-grid"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {cells.map((cell) => {
            if (cell.type === 'empty') {
              return <div key={cell.key} className="calendar-cell empty" />;
            }

            const hasWorkout = workoutDays.has(cell.dateKey);
            const isToday = cell.dateKey === todayKey;
            const isSelected = cell.dateKey === selectedDay;

            return (
              <button
                key={cell.key}
                type="button"
                className={[
                  'calendar-cell',
                  'day',
                  hasWorkout ? 'has-workout' : '',
                  isToday ? 'is-today' : '',
                  isSelected ? 'is-selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => handleDayClick(cell.dateKey, cell.day)}
              >
                <span className="day-number">{cell.day}</span>
                {hasWorkout && <span className="workout-dot" aria-hidden="true" />}
              </button>
            );
          })}
        </div>

        <div className="calendar-legend text">
          <span className="legend-item">
            <span className="workout-dot" /> Workout logged
          </span>
          {!user && (
            <p className="calendar-hint">
              Log in to mark activity days from your streak history.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

export default Calendar;
