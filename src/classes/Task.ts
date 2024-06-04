class Task {
    Title: string;
    Notes: string;
    DueDateTime: string;

    constructor(title: string, notes: string, dueDateTime: string) {
        this.Title = title;
        this.Notes = notes;
        this.DueDateTime = dueDateTime;
    }

    searchTasks(searchText: string): Task[] {
        // Search for tasks with the given text
        return [];
    }
}

export default Task;