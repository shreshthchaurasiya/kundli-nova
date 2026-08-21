export class NumerologyService {
  /**
   * Reduces a number to a single digit (1-9)
   * Example: 29 -> 11 -> 2
   */
  private reduceNumber(num: number): number {
    if (num <= 9) return num;
    const sum = String(num).split('').reduce((acc, digit) => acc + parseInt(digit, 10), 0);
    return this.reduceNumber(sum);
  }

  /**
   * Calculates Numerology based on Date of Birth
   * @param dob Date of birth in YYYY-MM-DD format
   */
  public getNumerology(dob: string) {
    if (!dob) {
      throw new Error("Date of Birth is required (YYYY-MM-DD)");
    }
    const [yearStr, monthStr, dayStr] = dob.split('-');
    if (!yearStr || !monthStr || !dayStr) {
      throw new Error("Invalid DOB format. Expected YYYY-MM-DD");
    }

    const day = parseInt(dayStr, 10);
    const month = parseInt(monthStr, 10);
    const year = parseInt(yearStr, 10);

    const mulank = this.reduceNumber(day);
    const bhagyank = this.reduceNumber(day + month + year);

    return {
      mulank, // Root Number
      bhagyank, // Destiny Number
      traits: this.getTraitsForNumber(mulank),
      luckyColors: this.getColorsForNumber(mulank)
    };
  }

  private getTraitsForNumber(num: number): string {
    const traits: Record<number, string> = {
      1: "Leadership, independence, originality, and ambition. Ruled by the Sun.",
      2: "Cooperation, diplomacy, sensitivity, and partnership. Ruled by the Moon.",
      3: "Creativity, self-expression, joy, and communication. Ruled by Jupiter.",
      4: "Stability, practicality, hard work, and discipline. Ruled by Rahu.",
      5: "Freedom, adaptability, adventure, and dynamic energy. Ruled by Mercury.",
      6: "Harmony, responsibility, love, and nurturing. Ruled by Venus.",
      7: "Spirituality, analysis, wisdom, and introspection. Ruled by Ketu.",
      8: "Material success, power, authority, and karma. Ruled by Saturn.",
      9: "Humanitarianism, compassion, endings, and completion. Ruled by Mars."
    };
    return traits[num] || "Unknown";
  }

  private getColorsForNumber(num: number): string[] {
    const colors: Record<number, string[]> = {
      1: ["Red", "Orange", "Yellow"],
      2: ["White", "Silver", "Pale Green"],
      3: ["Yellow", "Purple", "Pink"],
      4: ["Blue", "Grey", "Brown"],
      5: ["Green", "Turquoise", "Light Blue"],
      6: ["Pink", "Light Blue", "White"],
      7: ["Sea Green", "Light Yellow", "Grey"],
      8: ["Black", "Dark Blue", "Purple"],
      9: ["Red", "Crimson", "Rose"]
    };
    return colors[num] || [];
  }
}
