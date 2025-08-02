import { describe, test, expect } from 'vitest';
import { generateSchedule, validateEquitableDistribution, generateInitials } from '../rotation';

describe('generateSchedule', () => {
  const testNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'];
  const startDate = new Date('2024-01-01'); // Lundi 1er janvier 2024

  test('should throw error if not exactly 5 names', () => {
    expect(() => generateSchedule(['Alice', 'Bob'], startDate, 5)).toThrow(
      'Il faut exactement 5 personnes.'
    );
    
    expect(() => generateSchedule(['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'], startDate, 5)).toThrow(
      'Il faut exactement 5 personnes.'
    );
  });

  test('should throw error if numberOfDays is invalid', () => {
    expect(() => generateSchedule(testNames, startDate, 0)).toThrow(
      'Le nombre de jours doit être supérieur à 0.'
    );
    
    expect(() => generateSchedule(testNames, startDate, -1)).toThrow(
      'Le nombre de jours doit être supérieur à 0.'
    );
  });

  test('should generate correct number of days', () => {
    const result = generateSchedule(testNames, startDate, 5);
    expect(result).toHaveLength(5);
  });

  test('should have exactly 3 people for 18h and 2 for 16h each day', () => {
    const result = generateSchedule(testNames, startDate, 5);
    
    result.forEach(assignment => {
      expect(assignment.eighteen).toHaveLength(3);
      expect(assignment.sixteen).toHaveLength(2);
    });
  });

  test('should ensure each person appears exactly once per day', () => {
    const result = generateSchedule(testNames, startDate, 5);
    
    result.forEach(assignment => {
      const allAssigned = [...assignment.eighteen, ...assignment.sixteen];
      expect(allAssigned).toHaveLength(5);
      expect(new Set(allAssigned).size).toBe(5);
      
      // Vérifier que tous les noms de l'équipe sont présents
      testNames.forEach(name => {
        expect(allAssigned).toContain(name);
      });
    });
  });

  test('should implement correct rotation pattern', () => {
    const result = generateSchedule(testNames, startDate, 5);
    
    // Jour 0 : rotation de 0 -> Alice, Bob, Charlie (18h), Diana, Eve (16h)
    expect(result[0].eighteen).toEqual(['Alice', 'Bob', 'Charlie']);
    expect(result[0].sixteen).toEqual(['Diana', 'Eve']);
    
    // Jour 1 : rotation de 1 -> Bob, Charlie, Diana (18h), Eve, Alice (16h)
    expect(result[1].eighteen).toEqual(['Bob', 'Charlie', 'Diana']);
    expect(result[1].sixteen).toEqual(['Eve', 'Alice']);
    
    // Jour 2 : rotation de 2 -> Charlie, Diana, Eve (18h), Alice, Bob (16h)
    expect(result[2].eighteen).toEqual(['Charlie', 'Diana', 'Eve']);
    expect(result[2].sixteen).toEqual(['Alice', 'Bob']);
    
    // Jour 3 : rotation de 3 -> Diana, Eve, Alice (18h), Bob, Charlie (16h)
    expect(result[3].eighteen).toEqual(['Diana', 'Eve', 'Alice']);
    expect(result[3].sixteen).toEqual(['Bob', 'Charlie']);
    
    // Jour 4 : rotation de 4 -> Eve, Alice, Bob (18h), Charlie, Diana (16h)
    expect(result[4].eighteen).toEqual(['Eve', 'Alice', 'Bob']);
    expect(result[4].sixteen).toEqual(['Charlie', 'Diana']);
  });

  test('should generate dates in ISO format', () => {
    const result = generateSchedule(testNames, startDate, 3);
    
    expect(result[0].dateISO).toBe('2024-01-01');
    expect(result[1].dateISO).toBe('2024-01-02');
    expect(result[2].dateISO).toBe('2024-01-03');
  });

  test('should skip weekends when requested', () => {
    // Commencer un vendredi (5 janvier 2024)
    const fridayStart = new Date('2024-01-05');
    const result = generateSchedule(testNames, fridayStart, 3, true);
    
    expect(result[0].dateISO).toBe('2024-01-05'); // Vendredi
    expect(result[1].dateISO).toBe('2024-01-08'); // Lundi (samedi/dimanche sautés)
    expect(result[2].dateISO).toBe('2024-01-09'); // Mardi
  });

  test('should not skip weekends when not requested', () => {
    const fridayStart = new Date('2024-01-05');
    const result = generateSchedule(testNames, fridayStart, 3, false);
    
    expect(result[0].dateISO).toBe('2024-01-05'); // Vendredi
    expect(result[1].dateISO).toBe('2024-01-06'); // Samedi
    expect(result[2].dateISO).toBe('2024-01-07'); // Dimanche
  });

  test('should respect locked days', () => {
    const lockedAssignment = {
      dateISO: '2024-01-02',
      eighteen: ['Eve', 'Diana', 'Charlie'],
      sixteen: ['Bob', 'Alice'],
      locked: true
    };
    
    const locked = { '2024-01-02': lockedAssignment };
    const result = generateSchedule(testNames, startDate, 3, false, locked);
    
    // Le jour verrouillé doit être préservé
    expect(result[1]).toEqual(lockedAssignment);
    
    // Les autres jours suivent la rotation normale
    expect(result[0].eighteen).toEqual(['Alice', 'Bob', 'Charlie']);
    expect(result[2].eighteen).toEqual(['Charlie', 'Diana', 'Eve']);
  });
});

describe('validateEquitableDistribution', () => {
  const testNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'];

  test('should validate perfect 5-day cycle', () => {
    const assignments = generateSchedule(testNames, new Date('2024-01-01'), 5);
    const { isValid, distribution } = validateEquitableDistribution(assignments, testNames);
    
    expect(isValid).toBe(true);
    
    testNames.forEach(name => {
      expect(distribution[name].eighteen).toBe(3);
      expect(distribution[name].sixteen).toBe(2);
    });
  });

  test('should handle multiple 5-day cycles', () => {
    const assignments = generateSchedule(testNames, new Date('2024-01-01'), 10);
    const { distribution } = validateEquitableDistribution(assignments, testNames);
    
    testNames.forEach(name => {
      expect(distribution[name].eighteen).toBe(6); // 2 cycles × 3
      expect(distribution[name].sixteen).toBe(4);  // 2 cycles × 2
    });
  });

  test('should count correctly with partial cycles', () => {
    const assignments = generateSchedule(testNames, new Date('2024-01-01'), 7);
    const { distribution } = validateEquitableDistribution(assignments, testNames);
    
    // Sur 7 jours, la distribution ne peut pas être parfaitement équitable
    const totalEighteen = Object.values(distribution).reduce((sum, d) => sum + d.eighteen, 0);
    const totalSixteen = Object.values(distribution).reduce((sum, d) => sum + d.sixteen, 0);
    
    expect(totalEighteen).toBe(21); // 7 jours × 3 personnes
    expect(totalSixteen).toBe(14);  // 7 jours × 2 personnes
  });
});

describe('generateInitials', () => {
  test('should generate initials from single name', () => {
    expect(generateInitials('Alice')).toBe('A');
    expect(generateInitials('bob')).toBe('B');
  });

  test('should generate initials from multiple names', () => {
    expect(generateInitials('Alice Martin')).toBe('AM');
    expect(generateInitials('Jean-Pierre Dupont')).toBe('JD');
    expect(generateInitials('Marie Claire Dubois')).toBe('MC');
  });

  test('should handle edge cases', () => {
    expect(generateInitials('')).toBe('');
    expect(generateInitials(' ')).toBe('');
    expect(generateInitials('a')).toBe('A');
    expect(generateInitials('A B C D E F')).toBe('AB'); // Maximum 2 caractères
  });

  test('should be case insensitive', () => {
    expect(generateInitials('alice martin')).toBe('AM');
    expect(generateInitials('ALICE MARTIN')).toBe('AM');
    expect(generateInitials('AlIcE mArTiN')).toBe('AM');
  });
});