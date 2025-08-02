import { describe, it, expect } from 'vitest';
import { generateScheduleWithLeaves } from '../rotation';
import { isOnLeave } from '../date';
import type { Person } from '../types';

describe('generateScheduleWithLeaves', () => {
  const people: Person[] = [
    { id: '1', name: 'Alice', leaves: [{ start: '2024-01-03', end: '2024-01-05' }] },
    { id: '2', name: 'Bob', leaves: [] },
    { id: '3', name: 'Charlie', leaves: [] },
    { id: '4', name: 'David', leaves: [] },
    { id: '5', name: 'Eve', leaves: [] }
  ];

  it('should exclude people on leave from assignments', () => {
    const assignments = generateScheduleWithLeaves(
      people,
      new Date('2024-01-01'),
      5,
      false
    );

    // Le 3 janvier, Alice est en congé
    const jan3Assignment = assignments.find(a => a.dateISO === '2024-01-03');
    expect(jan3Assignment).toBeDefined();
    expect(jan3Assignment!.absents).toContain('Alice');
    expect(jan3Assignment!.eighteen).not.toContain('Alice');
    expect(jan3Assignment!.sixteen).not.toContain('Alice');
  });

  it('should maintain rotation order for present people', () => {
    const assignments = generateScheduleWithLeaves(
      people,
      new Date('2024-01-01'),
      5,
      false
    );

    // Le 1er janvier, personne en congé, rotation normale
    const jan1 = assignments.find(a => a.dateISO === '2024-01-01');
    expect(jan1!.eighteen).toEqual(['Alice', 'Bob', 'Charlie']);
    expect(jan1!.sixteen).toEqual(['David', 'Eve']);

    // Le 3 janvier, Alice absente, Bob en première position
    const jan3 = assignments.find(a => a.dateISO === '2024-01-03');
    expect(jan3!.eighteen).toContain('Bob');
    expect(jan3!.eighteen).toContain('Charlie');
    expect(jan3!.eighteen).toContain('David');
    expect(jan3!.sixteen).toContain('Eve');
  });

  it('should calculate missing positions correctly', () => {
    const peopleWithManyLeaves: Person[] = [
      { id: '1', name: 'Alice', leaves: [{ start: '2024-01-01', end: '2024-01-01' }] },
      { id: '2', name: 'Bob', leaves: [{ start: '2024-01-01', end: '2024-01-01' }] },
      { id: '3', name: 'Charlie', leaves: [] },
      { id: '4', name: 'David', leaves: [] },
      { id: '5', name: 'Eve', leaves: [] }
    ];

    const assignments = generateScheduleWithLeaves(
      peopleWithManyLeaves,
      new Date('2024-01-01'),
      1,
      false
    );

    const assignment = assignments[0];
    expect(assignment.absents).toEqual(['Alice', 'Bob']);
    expect(assignment.eighteen.length).toBe(3);
    expect(assignment.sixteen.length).toBe(0);
    expect(assignment.missing).toBe(0); // 3 présents, 3 affectés à 18h
  });

  it('should handle insufficient staff', () => {
    const peopleWithManyLeaves: Person[] = [
      { id: '1', name: 'Alice', leaves: [{ start: '2024-01-01', end: '2024-01-01' }] },
      { id: '2', name: 'Bob', leaves: [{ start: '2024-01-01', end: '2024-01-01' }] },
      { id: '3', name: 'Charlie', leaves: [{ start: '2024-01-01', end: '2024-01-01' }] },
      { id: '4', name: 'David', leaves: [] },
      { id: '5', name: 'Eve', leaves: [] }
    ];

    const assignments = generateScheduleWithLeaves(
      peopleWithManyLeaves,
      new Date('2024-01-01'),
      1,
      false
    );

    const assignment = assignments[0];
    expect(assignment.absents.length).toBe(3);
    expect(assignment.eighteen.length).toBe(2); // Seulement 2 disponibles
    expect(assignment.sixteen.length).toBe(0);
    expect(assignment.missing).toBe(0); // Pas de missing car on a que 2 personnes au total
  });

  it('should skip weekends when requested', () => {
    const assignments = generateScheduleWithLeaves(
      people,
      new Date('2024-01-05'), // vendredi
      3,
      true // skip weekends
    );

    const dates = assignments.map(a => a.dateISO);
    expect(dates).not.toContain('2024-01-06'); // samedi
    expect(dates).not.toContain('2024-01-07'); // dimanche
  });

  it('should respect maximum assignments per shift', () => {
    const assignments = generateScheduleWithLeaves(
      people,
      new Date('2024-01-01'),
      5,
      false
    );

    assignments.forEach(assignment => {
      expect(assignment.eighteen.length).toBeLessThanOrEqual(3);
      expect(assignment.sixteen.length).toBeLessThanOrEqual(2);
    });
  });
});

describe('isOnLeave', () => {
  it('should detect when someone is on leave', () => {
    const leaves = [
      { start: '2024-01-01', end: '2024-01-03' },
      { start: '2024-01-10', end: '2024-01-10' }
    ];

    expect(isOnLeave('2024-01-01', leaves)).toBe(true);
    expect(isOnLeave('2024-01-02', leaves)).toBe(true);
    expect(isOnLeave('2024-01-03', leaves)).toBe(true);
    expect(isOnLeave('2024-01-04', leaves)).toBe(false);
    expect(isOnLeave('2024-01-10', leaves)).toBe(true);
    expect(isOnLeave('2024-01-11', leaves)).toBe(false);
  });

  it('should handle empty leaves array', () => {
    expect(isOnLeave('2024-01-01', [])).toBe(false);
  });

  it('should handle undefined leaves', () => {
    expect(isOnLeave('2024-01-01', undefined as any)).toBe(false);
  });
});