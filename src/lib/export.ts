import { format } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { createEvent, EventAttributes } from 'ics';
import type { Assignment, TeamMember } from './types';

const TIMEZONE = 'Europe/Paris';

/**
 * Exporte le planning au format CSV
 */
export function exportToCSV(assignments: Assignment[]): string {
  const headers = ['date', '18h_1', '18h_2', '18h_3', '16h_1', '16h_2'];
  const rows = [headers.join(',')];

  assignments.forEach(assignment => {
    const date = formatInTimeZone(new Date(assignment.dateISO), TIMEZONE, 'dd/MM/yyyy');
    const eighteen = assignment.eighteen.concat(['', '', '']).slice(0, 3);
    const sixteen = assignment.sixteen.concat(['', '']).slice(0, 2);
    
    const row = [date, ...eighteen, ...sixteen]
      .map(cell => `"${cell.replace(/"/g, '""')}"`)
      .join(',');
    
    rows.push(row);
  });

  return rows.join('\n');
}

/**
 * Télécharge un fichier
 */
export function downloadFile(content: string, filename: string, type: string = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Crée un événement ICS pour une personne et un jour donné
 */
function createScheduleEvent(
  memberName: string,
  dateISO: string,
  shift: '18h' | '16h'
): EventAttributes {
  const startTime = shift === '18h' ? 9 : 9; // Début à 9h
  const endTime = shift === '18h' ? 18 : 16; // Fin selon le créneau
  
  // Créer les dates avec le fuseau Europe/Paris
  const eventDate = new Date(dateISO + 'T00:00:00');
  const startDateTime = new Date(dateISO + `T${startTime.toString().padStart(2, '0')}:00:00`);
  const endDateTime = new Date(dateISO + `T${endTime.toString().padStart(2, '0')}:00:00`);

  // Convertir en UTC pour ICS
  const startUtc = fromZonedTime(startDateTime, TIMEZONE);
  const endUtc = fromZonedTime(endDateTime, TIMEZONE);

  const title = shift === '18h' ? 
    `Service 18h - ${memberName}` : 
    `Sortie 16h - ${memberName}`;

  return {
    start: [
      startUtc.getFullYear(),
      startUtc.getMonth() + 1,
      startUtc.getDate(),
      startUtc.getHours(),
      startUtc.getMinutes()
    ],
    end: [
      endUtc.getFullYear(),
      endUtc.getMonth() + 1,
      endUtc.getDate(),
      endUtc.getHours(),
      endUtc.getMinutes()
    ],
    title,
    description: 'Planning généré automatiquement',
    uid: `${dateISO}-${memberName.replace(/\s+/g, '')}-${shift}@rotation-planner`,
    location: 'Bureau'
  };
}

/**
 * Exporte le planning au format ICS
 */
export function exportToICS(assignments: Assignment[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const events: EventAttributes[] = [];

    // Créer un événement pour chaque personne et chaque jour
    assignments.forEach(assignment => {
      // Événements pour les personnes qui finissent à 18h
      assignment.eighteen.forEach(memberName => {
        events.push(createScheduleEvent(memberName, assignment.dateISO, '18h'));
      });

      // Événements pour les personnes qui finissent à 16h
      assignment.sixteen.forEach(memberName => {
        events.push(createScheduleEvent(memberName, assignment.dateISO, '16h'));
      });
    });

    // Créer le fichier ICS
    const icsContent = events.map(event => {
      const { error, value } = createEvent(event);
      if (error) {
        console.error('Erreur création événement ICS:', error);
        return '';
      }
      return value || '';
    }).filter(Boolean).join('\n');

    if (icsContent) {
      resolve(icsContent);
    } else {
      reject(new Error('Erreur lors de la génération du fichier ICS'));
    }
  });
}

/**
 * Exporte les données au format JSON
 */
export function exportToJSON(
  assignments: Assignment[],
  teamMembers: TeamMember[],
  plannerParams: any
): string {
  const exportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    teamMembers,
    assignments,
    plannerParams: {
      ...plannerParams,
      startDate: plannerParams.startDate.toISOString()
    }
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Importe les données depuis un fichier JSON
 */
export function importFromJSON(jsonContent: string) {
  try {
    const data = JSON.parse(jsonContent);
    
    if (!data.teamMembers || !data.assignments) {
      throw new Error('Format de fichier invalide');
    }

    // Restaurer la date
    if (data.plannerParams?.startDate) {
      data.plannerParams.startDate = new Date(data.plannerParams.startDate);
    }

    return data;
  } catch (error) {
    throw new Error('Impossible de lire le fichier JSON');
  }
}