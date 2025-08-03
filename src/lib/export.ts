import { format } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { createEvent, EventAttributes } from 'ics';
import { unparse } from 'papaparse';
import type { Assignment, TeamMember } from './types';

const TIMEZONE = 'Europe/Paris';

/**
 * Formate les données pour l'export CSV selon le format spécifié
 */
function formatForCSV(assignments: Assignment[]) {
  return assignments.map((assignment) => {
    const date = new Date(assignment.dateISO);
    
    // Limiter les noms à 15 caractères pour un affichage propre
    const truncateName = (name: string) => name ? name.substring(0, 15) : "";
    
    // Garantir exactement 3 colonnes pour 18h et 2 pour 16h
    const eighteen = [...assignment.eighteen, "", "", ""].slice(0, 3);
    const sixteen = [...assignment.sixteen, "", ""].slice(0, 2);
    
    return {
      "Date": formatInTimeZone(date, TIMEZONE, 'dd/MM/yyyy'),
      "Jour": formatInTimeZone(date, TIMEZONE, 'EEEE').substring(0, 8),
      "18h-P1": truncateName(eighteen[0]),
      "18h-P2": truncateName(eighteen[1]),
      "18h-P3": truncateName(eighteen[2]),
      "16h-P1": truncateName(sixteen[0]),
      "16h-P2": truncateName(sixteen[1]),
      "Nb18h": assignment.eighteen.length,
      "Nb16h": assignment.sixteen.length,
      "Total": assignment.eighteen.length + assignment.sixteen.length,
      "Absents": assignment.absents?.join(";").substring(0, 30) || "",
      "NbAbs": assignment.absents?.length || 0,
      "Manque": assignment.missing ?? 0,
    };
  });
}

/**
 * Exporte le planning au format CSV avec PapaParse
 */
export function exportToCSV(assignments: Assignment[]): string {
  const formattedData = formatForCSV(assignments);
  
  return unparse(formattedData, {
    quotes: false,
    delimiter: ",",
    header: true,
  });
}

/**
 * Télécharge un fichier CSV
 */
export function downloadCSV(data: any[], filename: string = "planning.csv") {
  const csv = unparse(data, {
    quotes: false,
    delimiter: ",",
    header: true,
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Télécharge un fichier générique
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

/**
 * Exporte les rotations directement depuis Supabase au format CSV
 */
export async function exportRotationCSVFromSupabase(supabase: any, filename: string = "planning_rotation.csv") {
  try {
    const { data: rotations, error } = await supabase
      .from("rotations")
      .select("*")
      .order("date", { ascending: true });

    if (error) {
      throw new Error(`Erreur lors de la récupération des données: ${error.message}`);
    }

    if (!rotations || rotations.length === 0) {
      throw new Error("Aucune donnée de rotation trouvée");
    }

    // Convertir le format Supabase vers le format Assignment
    const assignments = rotations.map(rotation => ({
      dateISO: rotation.date,
      eighteen: rotation.eighteen || [],
      sixteen: rotation.sixteen || [],
      absents: rotation.absents || [],
      missing: rotation.missing || 0,
    }));

    const formatted = formatForCSV(assignments);
    downloadCSV(formatted, filename);
    
    return { success: true, count: rotations.length };
  } catch (error) {
    console.error('Erreur export CSV depuis Supabase:', error);
    throw error;
  }
}