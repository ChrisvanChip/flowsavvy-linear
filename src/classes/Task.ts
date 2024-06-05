class Task {
    id: number;
    Title: string;
    Notes: string;
    DueDateTime: string;

    constructor(id: number, title: string, notes: string, dueDateTime: string) {
        this.id = id;
        this.Title = title;
        this.Notes = notes;
        this.DueDateTime = dueDateTime;
    }
}

export default Task;