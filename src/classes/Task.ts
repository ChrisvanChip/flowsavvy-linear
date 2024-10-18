import dotenv from "dotenv";
import assert from "node:assert";

dotenv.config();
assert(process.env.CALENDAR_ID, '[env variables] CALENDAR_ID is required')

class Task {
    id: number;
    instanceId: number = 0;
    Completed: boolean = false;
    DurationHours: number;
    DurationMinutes: number;
    priority: number = 1;
    BufferTimeBeforeHours: number = 0;
    BufferTimeBeforeMinutes: number = 0;
    BufferTimeAfterHours: number = 0;
    BufferTimeAfterMinutes: number = 0;
    ProgressHours: number = 0;
    ProgressMinutes: number = 0;
    AccessLevel: number = 2;
    DontStartUntil: string = '0001-01-01T00:00';
    MinLengthHours: number = 0;
    MinLengthMinutes: number = 10;
    AllDay: boolean = false;
    FixedTime: boolean = false;
    Busy: boolean = true;
    ItemType: string = 'task';
    Changed: boolean = false;
    CalendarID: number = Number(process.env.CALENDAR_ID!);
    TimeProfileID: number;
    LastMovedUtc: string = '0001-01-01T00:00:00';
    StartDateTime: string = '2000-01-01T00:00:00';
    EndDateTime: string;
    DueDateTime: string | null = null;
    TimeZone: string = 'Floating';
    isAutoIgnored: boolean = false;
    RepeatType: string = 'Never';
    Interval: number = 1;
    Sunday: boolean = false;
    Monday: boolean = false;
    Tuesday: boolean = false;
    Wednesday: boolean = false;
    Thursday: boolean = false;
    Friday: boolean = false;
    Saturday: boolean = false;
    MonthlyType: string = 'Each...';
    Dates: string = '';
    MonthOrdinal: number = 0;
    WeekDay: number = 0;
    EndRepeatType: string = 'Never';
    NumOccurrences: number = 1;
    EndRepeatDate: string = '2024-06-12T00:00';
    Repeats: boolean = false;
    Notes: string;
    Title: string;
    Location: string = '';

    constructor(id: number, duration: number, title: string, notes: string, dueDate?: string, timeProfileId?: number) {
        this.id = id;
        this.DurationHours = Math.floor(duration / 60);
        this.DurationMinutes = duration % 60;
        this.Title = title;
        this.Notes = notes;
        this.DueDateTime = dueDate ? dueDate + 'T23:59:59' : null;
        this.EndDateTime = `2000-01-01T${this.DurationHours.toString().padStart(2, '0')}:${this.DurationMinutes.toString().padStart(2, '0')}:00`
        this.TimeProfileID = timeProfileId ?? 223930;
    }
}

export default Task;
