const DEADLINE = new Date("2026-09-01T05:30:30Z").getTime();

const countdown = {
  days: document.getElementById("countDays"),
  hours: document.getElementById("countHours"),
  minutes: document.getElementById("countMinutes"),
  seconds: document.getElementById("countSeconds")
};

function twoDigits(value) {
  return String(value).padStart(2, "0");
}

function updateCountdown() {
  const remaining = Math.max(0, DEADLINE - Date.now());
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  countdown.days.textContent = twoDigits(days);
  countdown.hours.textContent = twoDigits(hours);
  countdown.minutes.textContent = twoDigits(minutes);
  countdown.seconds.textContent = twoDigits(seconds);

  return remaining;
}

const remaining = updateCountdown();
if (remaining > 0) {
  const timer = setInterval(() => {
    if (updateCountdown() === 0) clearInterval(timer);
  }, 1000);
}
