/**
 * The C1-C7 cleaning checklists. Definitions live here rather than in the
 * database so a saved record keeps the wording it was filled in against;
 * the answers themselves are stored on the cleaning row.
 */

export type CheckColumn = 'done' | 'not_required' | 'defect' | 'pass' | 'fail' | 'na'

export type CheckItem = {
  no: number
  text: string
  columns: CheckColumn[]
  /** Label for the free-text box, when the item wants a reading or comment. */
  note?: string
}

export type ExtraField = {
  name: string
  label: string
  kind?: 'text' | 'textarea' | 'number' | 'select' | 'date'
  options?: string[]
  placeholder?: string
  /** Prefilled on a new check; the operator can change it. */
  default?: string
  /** Drop the blank choice, so the field always holds one of the options. */
  noEmpty?: boolean
}

export type CleaningForm = {
  code: string
  title: string
  frequency: string
  /** Roughly how often it is due, used to suggest the next date. */
  intervalDays: number
  sections: { heading?: string; items: CheckItem[] }[]
  extras: ExtraField[]
}

const DONE_DEFECT: CheckColumn[] = ['done', 'defect']
const DONE_NR_DEFECT: CheckColumn[] = ['done', 'not_required', 'defect']
const PASS_FAIL_NA: CheckColumn[] = ['pass', 'fail', 'na']

export const CLEANING_FORMS: CleaningForm[] = [
  {
    code: 'C1',
    title: 'Daily checks',
    frequency: 'Daily',
    intervalDays: 1,
    sections: [
      {
        items: [
          { no: 1, text: 'Boiler operating normally, no alarms or faults displayed', columns: DONE_DEFECT },
          { no: 2, text: 'Burner operating normally', columns: DONE_DEFECT },
          { no: 3, text: 'Flame and combustion appear normal', columns: DONE_DEFECT },
          { no: 4, text: 'No abnormal smoke or smell', columns: DONE_DEFECT },
          { no: 5, text: 'Boiler water temperature checked', columns: DONE_DEFECT },
          { no: 6, text: 'System pressure checked', columns: DONE_DEFECT },
          { no: 7, text: 'Ash accumulation checked', columns: DONE_DEFECT },
          { no: 8, text: 'Ash removed if required', columns: DONE_DEFECT },
          { no: 11, text: 'Service doors and covers closed and secure', columns: DONE_DEFECT },
        ],
      },
    ],
    extras: [
      {
        name: 'ash_condition',
        label: 'Ash condition',
        kind: 'select',
        options: ['Low', 'Medium', 'High', 'Removed'],
        default: 'Low',
      },
      { name: 'alarm_code', label: 'Alarm or fault code', default: 'None' },
      {
        name: 'action_completed',
        label: 'Action completed',
        kind: 'select',
        options: ['Yes', 'No', 'N/A'],
        default: 'N/A',
        noEmpty: true,
      },
      { name: 'operator_signature', label: 'Operator signature' },
    ],
  },
  {
    code: 'C2',
    title: 'Weekly checks',
    frequency: 'Weekly',
    intervalDays: 7,
    sections: [
      {
        items: [
          { no: 12, text: 'Ash box / drawer emptied', columns: DONE_NR_DEFECT },
          { no: 13, text: 'Area beneath and around ash box cleaned', columns: DONE_NR_DEFECT },
          { no: 14, text: 'Dust and ash removed from combustion chamber / firebox', columns: DONE_NR_DEFECT },
          {
            no: 15,
            text: 'Boiler tubes / cylinder / convection pipes brushed with supplied brush or rake',
            columns: DONE_NR_DEFECT,
          },
          { no: 16, text: 'Cast-iron crucible / brazier holes cleared', columns: DONE_NR_DEFECT },
          { no: 17, text: 'Automatic ignition pipe cleaned (where fitted)', columns: DONE_NR_DEFECT },
          { no: 18, text: 'Burner head cleaned and combustion-air openings clear', columns: DONE_NR_DEFECT },
          { no: 19, text: 'Visual check of door and hatch seals', columns: DONE_NR_DEFECT },
        ],
      },
    ],
    extras: [
      { name: 'operator_signature', label: 'Operator signature' },
    ],
  },
  {
    code: 'C3',
    title: 'Fortnightly checks',
    frequency: 'Twice a month',
    intervalDays: 15,
    sections: [
      {
        items: [
          { no: 20, text: 'Boiler pipes brushed and dust residue removed from ash box area', columns: DONE_NR_DEFECT },
          {
            no: 22,
            text: 'Boiler door and service-door gaskets checked for damage, compression and air-tightness',
            columns: DONE_NR_DEFECT,
          },
          { no: 23, text: 'Ash removed from convection surfaces', columns: DONE_NR_DEFECT },
          { no: 24, text: 'Fire and convection parts swept', columns: DONE_NR_DEFECT },
        ],
      },
    ],
    extras: [
      {
        name: 'gasket_result',
        label: 'Gasket result',
        kind: 'select',
        options: ['Pass', 'Fail'],
        default: 'Pass',
        noEmpty: true,
      },
      { name: 'gasket_action', label: 'Gasket adjustment or replacement', default: 'N/A' },
      {
        name: 'convection_condition',
        label: 'Soot / ash condition on convection surfaces',
        kind: 'select',
        options: ['Fine & Easy To Remove', 'Tar-like & Hard To Remove'],
        default: 'Fine & Easy To Remove',
        noEmpty: true,
      },
      { name: 'operator_signature', label: 'Operator signature' },
    ],
  },
  {
    code: 'C4',
    title: 'Monthly checks',
    frequency: 'Monthly',
    intervalDays: 30,
    sections: [
      {
        items: [
          { no: 25, text: 'Chimney / flue cleaned from accessible inspection covers', columns: DONE_NR_DEFECT },
          { no: 26, text: 'Flue inspection covers and doors refitted and secure', columns: DONE_NR_DEFECT },
          { no: 28, text: 'Fuel store and delivery area checked for spillage and moisture', columns: DONE_NR_DEFECT },
        ],
      },
    ],
    extras: [
      {
        name: 'flue_result',
        label: 'Flue inspection result',
        kind: 'select',
        options: ['Pass', 'Fail'],
        default: 'Pass',
        noEmpty: true,
      },
      {
        name: 'residue_removed',
        label: 'Quantity / condition of residue removed',
        kind: 'select',
        options: ['Acceptable', 'Unacceptable'],
        default: 'Acceptable',
        noEmpty: true,
      },
      { name: 'defects_identified', label: 'Defects identified', kind: 'textarea', default: 'None' },
      {
        name: 'corrective_action',
        label: 'Corrective action / parts replaced',
        kind: 'textarea',
        default: 'N/A',
      },
      {
        name: 'contractor_attended',
        label: 'Contractor attended',
        kind: 'select',
        options: ['Yes', 'No'],
        default: 'No',
        noEmpty: true,
      },
      { name: 'contractor_reference', label: 'Contractor report reference', default: 'N/A' },
      { name: 'operator_signature', label: 'Operator signature' },
    ],
  },
  {
    code: 'C5',
    title: 'Two-monthly checks',
    frequency: 'Every 2 months',
    intervalDays: 61,
    sections: [
      {
        items: [
          {
            no: 1,
            text: 'Combustion chamber inspected for creosote, tar and scaling; cleaned if required',
            columns: DONE_DEFECT,
          },
          { no: 2, text: 'Flue inspected for creosote, tar and scaling; cleaned if required', columns: DONE_DEFECT },
        ],
      },
    ],
    extras: [
      {
        name: 'deposit_condition',
        label: 'Condition of deposits',
        kind: 'select',
        options: ['Acceptable', 'Unacceptable'],
        default: 'Acceptable',
        noEmpty: true,
      },
      { name: 'action_taken', label: 'Action taken', kind: 'textarea', default: 'N/A' },
      { name: 'operator_signature', label: 'Operator signature' },
    ],
  },
  {
    code: 'C6',
    title: 'Quarterly checks',
    frequency: 'Quarterly',
    intervalDays: 91,
    sections: [
      {
        items: [
          {
            no: 3,
            text: 'Relief valve manually operated and confirmed to pass water',
            columns: DONE_DEFECT,
            note: 'Pass / Fail',
          },
          { no: 4, text: 'System pressure checked after valve test', columns: DONE_DEFECT },
        ],
      },
    ],
    extras: [
      {
        name: 'valve_result',
        label: 'Relief valve result',
        kind: 'select',
        options: ['Pass', 'Fail'],
        default: 'Pass',
        noEmpty: true,
      },
      { name: 'action_taken', label: 'Action taken', kind: 'textarea', default: 'N/A' },
      { name: 'operator_signature', label: 'Operator signature' },
    ],
  },
  {
    code: 'C7',
    title: 'Annual / end-of-season checks',
    frequency: 'Annual',
    intervalDays: 365,
    sections: [
      {
        items: [
          { no: 5, text: 'Chimney swept (competent or qualified sweep where required)', columns: PASS_FAIL_NA },
          {
            no: 6,
            text: 'Boiler walls, water jacket, combustion chamber and flue passages fully cleaned',
            columns: PASS_FAIL_NA,
          },
          { no: 7, text: 'Convection passages confirmed clear', columns: PASS_FAIL_NA },
          { no: 8, text: 'Flue connection confirmed clear', columns: PASS_FAIL_NA },
          {
            no: 9,
            text: 'Hopper removed; burner, rear burner area and auger cleaned of residue',
            columns: PASS_FAIL_NA,
          },
          { no: 10, text: 'Burner fan, impeller, gearmotor and auger assembly cleaned', columns: PASS_FAIL_NA },
          { no: 11, text: 'Pinion lubricated with specified grease', columns: PASS_FAIL_NA },
          { no: 12, text: 'Chain lubricated with specified grease', columns: PASS_FAIL_NA },
          { no: 13, text: 'Bearing lubricated with specified grease', columns: PASS_FAIL_NA },
          {
            no: 14,
            text: 'Gaskets, covers, hatches, inspection doors and seals checked; defective items replaced',
            columns: PASS_FAIL_NA,
          },
          { no: 15, text: 'Water level, expansion vessel, pump and venting checked', columns: PASS_FAIL_NA },
          { no: 16, text: 'Relief valve tested', columns: PASS_FAIL_NA },
          { no: 17, text: 'Safety thermostat / BVTS checked', columns: PASS_FAIL_NA },
          { no: 18, text: 'Combustion settings checked', columns: PASS_FAIL_NA },
          { no: 19, text: 'Boiler returned to service safely', columns: PASS_FAIL_NA },
        ],
      },
    ],
    extras: [
      { name: 'outstanding_actions', label: 'Outstanding actions', kind: 'textarea', default: 'N/A' },
      { name: 'next_due', label: 'Next due date', kind: 'date' },
      { name: 'operator_signature', label: 'Operator / supervisor signature' },
    ],
  },
]

/**
 * Extras that a form used to carry and that older records still hold. The
 * viewer falls back to these so history stays readable when a form changes --
 * "action required" became the record-level Notes box, but tens of thousands
 * of saved checks still have a value under the old name.
 */
export const RETIRED_EXTRA_LABELS: Record<string, string> = {
  action_required: 'Action required',
}

export const COLUMN_LABELS: Record<CheckColumn, string> = {
  done: 'Done',
  not_required: 'N/R',
  defect: 'Defect',
  pass: 'Pass',
  fail: 'Fail',
  na: 'N/A',
}

export function findForm(code: string) {
  return CLEANING_FORMS.find((form) => form.code === code)
}

export type ItemAnswer = Partial<Record<CheckColumn, boolean>> & { note?: string }

export type CleaningAnswers = {
  items: Record<string, ItemAnswer>
  extras: Record<string, string>
}

export function emptyAnswers(): CleaningAnswers {
  return { items: {}, extras: {} }
}

/** A blank check, with any prefilled record fields already filled in. */
export function startingAnswers(form: CleaningForm | undefined): CleaningAnswers {
  const extras: Record<string, string> = {}
  for (const extra of form?.extras ?? []) {
    if (extra.default) extras[extra.name] = extra.default
  }
  return { items: {}, extras }
}

/**
 * Every item ticked with its first column -- 'done' on C1-C6, 'pass' on C7 --
 * which is what a clean, uneventful check looks like. The day's round records a
 * whole form from one tap, so this is what that tap fills in.
 */
export function completedAnswers(form: CleaningForm | undefined): CleaningAnswers {
  const answers = startingAnswers(form)
  for (const section of form?.sections ?? []) {
    for (const item of section.items) {
      const column = item.columns[0]
      if (column) answers.items[String(item.no)] = { [column]: true }
    }
  }
  return answers
}

export function parseAnswers(raw: string): CleaningAnswers {
  if (!raw) return emptyAnswers()
  try {
    const parsed = JSON.parse(raw) as Partial<CleaningAnswers>
    return { items: parsed.items ?? {}, extras: parsed.extras ?? {} }
  } catch {
    return emptyAnswers()
  }
}

/** Items flagged as a defect or a fail, for the list and for alerts. */
export function defectItems(form: CleaningForm | undefined, answers: CleaningAnswers) {
  if (!form) return []
  const flagged: CheckItem[] = []
  for (const section of form.sections) {
    for (const item of section.items) {
      const answer = answers.items[String(item.no)]
      if (answer?.defect || answer?.fail) flagged.push(item)
    }
  }
  return flagged
}

export function countItems(form: CleaningForm | undefined) {
  if (!form) return 0
  return form.sections.reduce((total, section) => total + section.items.length, 0)
}

/** How many items have had something ticked. */
export function countAnswered(form: CleaningForm | undefined, answers: CleaningAnswers) {
  if (!form) return 0
  let answered = 0
  for (const section of form.sections) {
    for (const item of section.items) {
      const answer = answers.items[String(item.no)]
      if (answer && item.columns.some((column) => answer[column])) answered += 1
    }
  }
  return answered
}
