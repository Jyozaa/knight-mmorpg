export class QuestProgression {
  chapter = "I — THE QUIET FIELDS";
  objective = "Find a moment of peace on the hill.";
  rested = false;
  rest() {
    this.rested = true;
    this.objective = "Listen to the valley.";
  }
}
