import { format, addDays, isWeekend } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import type { Assignment, Person } from './types';
import { toISO, isOnLeave } from './date';

/**
 * Génère un planning de rotation équitable pour une équipe de 5 personnes
 * Règle : rotation circulaire, 3 personnes jusqu'à 18h, 2 jusqu'à 16h
 * 
 * @param names - Liste des 5 noms (exactement)
 * @param start - Date de début
 * @param days - Nombre de jours à planifier
 * @param skipWeekends - Ignorer samedi/dimanche
 * @param locked - Journées verrouillées (ne pas recalculer)
 * @returns Planning généré
 */
export function generateSchedule(
  names: string[],
  start: Date,
  days: number,
  skipWeekends: boolean = false,
  locked: Record<string, Assignment> = {}
): Assignment[] {
  if (names.length !== 5) {
    throw new Error("Il faut exactement 5 personnes.");
  }

  if (days < 1) {
    throw new Error("Le nombre de jours doit être supérieur à 0.");
  }

  const result: Assignment[] = [];
  let rotationIndex = 0; // Index de rotation effectif (ne progresse que les jours planifiés)
  let currentDate = new Date(start);
  let plannedDays = 0;

  while (plannedDays < days) {
    const dateISO = formatInTimeZone(currentDate, 'Europe/Paris', 'yyyy-MM-dd');
    const isCurrentWeekend = isWeekend(currentDate);

    // Si on ignore les week-ends et c'est un week-end, on passe au jour suivant
    if (skipWeekends && isCurrentWeekend) {
      currentDate = addDays(currentDate, 1);
      continue;
    }

    // Si la journée est verrouillée, on utilise l'affectation existante
    if (locked[dateISO]) {
      result.push({ ...locked[dateISO] });
    } else {
      // Calcul de la rotation : décalage vers la gauche
      const shiftAmount = rotationIndex % 5;
      const rotatedNames = [
        ...names.slice(shiftAmount),
        ...names.slice(0, shiftAmount)
      ];

      result.push({
        dateISO,
        eighteen: rotatedNames.slice(0, 3),
        sixteen: rotatedNames.slice(3, 5),
        absents: [],
        missing: 0,
        locked: false
      });
    }

    // Incrémenter les compteurs
    rotationIndex++;
    plannedDays++;
    currentDate = addDays(currentDate, 1);
  }

  return result;
}

type LockedMap = Record<string, Assignment>;

export function generateScheduleWithLeaves(
  people: Person[],
  start: Date,
  days: number,
  skipWeekends: boolean,
  locked: LockedMap = {}
): Assignment[] {
  if (people.length !== 5) throw new Error("Il faut exactement 5 personnes.");
  const names = people.map(p => p.name);
  const out: Assignment[] = [];
  let d = 0;

  for (let i = 0, cur = new Date(start); i < days; ) {
    const isWE = [0,6].includes(cur.getDay());
    const iso = toISO(cur);
    if (skipWeekends && isWE) { cur.setDate(cur.getDate()+1); continue; }

    if (locked[iso]) {
      out.push(locked[iso]);
    } else {
      const shift = d % 5;
      const rotated = names.slice(shift).concat(names.slice(0, shift));
      const absents = people.filter(p => isOnLeave(iso, p.leaves)).map(p => p.name);
      const available = rotated.filter(n => !absents.includes(n));

      const eighteen = available.slice(0, Math.min(3, available.length));
      const rest = available.slice(eighteen.length);
      const sixteen = rest.slice(0, Math.min(2, rest.length));

      const filled = eighteen.length + sixteen.length;
      const missing = Math.max(0, 5 - absents.length - filled);

      out.push({ dateISO: iso, eighteen, sixteen, absents, missing });
    }

    d += 1; i += 1; cur.setDate(cur.getDate()+1);
  }
  return out;
}

/**
 * Valide la distribution équitable sur un cycle complet
 * Sur 5 jours : chaque personne doit avoir 3 créneaux 18h et 2 créneaux 16h
 */
export function validateEquitableDistribution(
  assignments: Assignment[],
  names: string[]
): { isValid: boolean; distribution: Record<string, { eighteen: number; sixteen: number }> } {
  const distribution: Record<string, { eighteen: number; sixteen: number }> = {};
  
  // Initialiser les compteurs
  names.forEach(name => {
    distribution[name] = { eighteen: 0, sixteen: 0 };
  });

  // Compter les affectations
  assignments.forEach(assignment => {
    assignment.eighteen.forEach(name => {
      if (distribution[name]) {
        distribution[name].eighteen++;
      }
    });
    assignment.sixteen.forEach(name => {
      if (distribution[name]) {
        distribution[name].sixteen++;
      }
    });
  });

  // Pour un cycle de 5 jours, la distribution doit être 3/2
  // Pour des multiples de 5, chaque période de 5 jours doit respecter cette règle
  const cycles = Math.floor(assignments.length / 5);
  const remainingDays = assignments.length % 5;
  
  let isValid = true;
  
  if (cycles > 0) {
    // Vérifier que sur les cycles complets, la distribution est équitable
    names.forEach(name => {
      const expectedEighteen = cycles * 3;
      const expectedSixteen = cycles * 2;
      
      // Pour les cycles complets, on doit avoir exactement la bonne distribution
      if (assignments.length === cycles * 5) {
        if (distribution[name].eighteen !== expectedEighteen || 
            distribution[name].sixteen !== expectedSixteen) {
          isValid = false;
        }
      }
    });
  }

  return { isValid, distribution };
}

/**
 * Calcule les statistiques de distribution pour l'affichage
 */
export function getDistributionStats(assignments: Assignment[], names: string[]) {
  const { distribution } = validateEquitableDistribution(assignments, names);
  
  return names.map(name => ({
    name,
    eighteen: distribution[name]?.eighteen || 0,
    sixteen: distribution[name]?.sixteen || 0,
    total: (distribution[name]?.eighteen || 0) + (distribution[name]?.sixteen || 0)
  }));
}

/**
 * Génère les initiales à partir d'un nom
 */
export function generateInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
}