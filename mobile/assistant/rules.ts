export function evaluateRules(context) {
  const events = [];

  if (context.userIsOut && context.minutesSinceUpdate >= 30) {
    events.push({ type: "checkin_prompt" });
  }

  if (context.screen === "EmergencyContacts" && context.contactCount === 0) {
    events.push({ type: "suggest_add_contact" });
  }

  if (context.screen === "AlertScreen" && context.battery < 15) {
    events.push({ type: "low_battery_warning" });
  }

  return events;
}