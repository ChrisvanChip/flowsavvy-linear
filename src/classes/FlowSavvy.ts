import axios, {AxiosResponse} from 'axios';
import FormData from 'form-data';
import dotenv from "dotenv";
import assert from "node:assert";
import Task from "./Task";

dotenv.config();
assert(process.env.EMAIL, '[env variables] EMAIL is required')
assert(process.env.PASSWORD, '[env variables] PASSWORD is required')
assert(process.env.TIMEZONE, '[env variables] TIMEZONE is required')

let email = process.env.EMAIL;
let password = process.env.PASSWORD;
let timezone = process.env.TIMEZONE;

let BaseURL = 'https://my.flowsavvy.app/api/'

class FlowSavvy {
    private Cookie: string[] = [];
    private CsrfToken: string = '';

    constructor() {
        this.login().then(() => {
            console.log("🚀 FlowSavvy logged in successfully.")
        });
    }

    async refreshAntiForgeryToken() {
        let response = await axios.get(BaseURL + 'Schedule/AntiForgeryToken', {
            headers: {
                'Cookie': this.Cookie
            }
        })
        let Cookies = response.headers['set-cookie'];
        let Token = response.data;
        let Regex = /<input name="__RequestVerificationToken" type="hidden" value="(.*)" \/>/g;
        let Match = Regex.exec(Token);
        let RequestVerificationToken = Match ? Match[1] : '';
        if (this.Cookie.length === 0) {
            this.Cookie = Cookies || [];
        } else if (Cookies) {
            this.Cookie = this.Cookie.map(cookie => {
                const newCookie = Cookies.find(c => c.includes('.AspNetCore.Antiforgery.'));
                return cookie.includes('.AspNetCore.Antiforgery.') && newCookie ? newCookie : cookie;
            });
        }
        this.CsrfToken = RequestVerificationToken;
    }

    async login() {
        let self = this
        await this.refreshAntiForgeryToken()

        let formData = new FormData();
        formData.append('Email', email);
        formData.append('Password', password);
        formData.append('TimeZone', timezone);

        const config = {
            headers: {
                ...formData.getHeaders(),
                'x-csrf-token': this.CsrfToken,
                'Cookie': this.Cookie
            }
        };

        axios.post('https://my.flowsavvy.app/api/Account/Login', formData, config)
            .then(response => {
                if (response.data.success !== true || !response.headers['set-cookie']) {
                    throw new Error('Login failed. Recheck your credentials in the .env file.');
                }
                self.Cookie.push(response.headers['set-cookie'][2])
            })
            .catch(error => {
                console.error(error);
            });
    }

    async request(method: string, endpoint: string, data: any, withToken?: boolean, headers?: any, donotretry?: boolean): Promise<AxiosResponse> {
        if (withToken) {
            await this.refreshAntiForgeryToken()
        }

        let response = await axios({
            method: method,
            url: BaseURL + endpoint,
            data: data,
            headers: {
                'Cookie': this.Cookie,
                'x-csrf-token': this.CsrfToken,
                ...headers
            },
        });

        if (!donotretry && response.status === 302) {
            this.login().then(() => {
                return this.request(method, endpoint, data, headers, withToken, true);
            })
        }

        return response;
    }

    async searchTask(query: string): Promise<Task | undefined> {
        let task: Task;
        let response = await this.request('GET', `item/search?query=${query}&searchCompletedTasks=false&getItemsAfterCursor=true&takeFirst=true&batchSize=50`, {})

        let tasksData = response.data.searchResponse.items;
        if (tasksData.length === 0) {
            return;
        }

        let taskData = tasksData[0];
        let duration = taskData.DurationHours * 60 + taskData.DurationMinutes;
        task = new Task(taskData.id, duration, taskData.Title, taskData.Notes, taskData.DueDateTime);

        return task;
    }

    async forceRecalculate() {
        let formData = new FormData();
        formData.append('force', 'true')
        await this.request('POST', 'Schedule/Recalculate', formData, true, formData.getHeaders())
    }
}

export default FlowSavvy;
