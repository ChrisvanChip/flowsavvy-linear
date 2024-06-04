import axios, {AxiosResponse} from 'axios';
import FormData from 'form-data';
import dotenv from "dotenv";
import assert from "node:assert";

dotenv.config();
assert(process.env.EMAIL, 'EMAIL is required')
assert(process.env.PASSWORD, 'PASSWORD is required')
assert(process.env.TIMEZONE, 'TIMEZONE is required')

let email = process.env.EMAIL;
let password = process.env.PASSWORD;
let timezone = process.env.TIMEZONE;

let BaseURL = 'https://my.flowsavvy.app/api/'

class FlowSavvy {
    private Cookie: string = '';

    constructor() {
        this.login();

        console.log("🚀 FlowSavvy logged in successfully.")
    }

    login() {
        let self = this
        // FlowSavvy uses ASP.NET Core AntiForgeryToken for CSRF protection
        axios.get(BaseURL + 'Schedule/AntiForgeryToken').then((response) => {
            let Cookies = response.headers['set-cookie'];
            let Token = response.data;
            let Regex = /<input name="__RequestVerificationToken" type="hidden" value="(.*)" \/>/g;
            let Match = Regex.exec(Token);
            let RequestVerificationToken = Match ? Match[1] : '';

            let formData = new FormData();
            formData.append('Email', email);
            formData.append('Password', password);
            formData.append('TimeZone', timezone);
            const config = {
                headers: {
                    ...formData.getHeaders(),
                    'x-csrf-token': RequestVerificationToken,
                    'Cookie': Cookies
                }
            };

            axios.post('https://my.flowsavvy.app/api/Account/Login', formData, config)
                .then(response => {
                    if (response.data.success !== true || !response.headers['set-cookie']) {
                        throw new Error('Login failed. Recheck your credentials in the .env file.');
                    }
                    self.Cookie = response.headers['set-cookie'][2]
                })
                .catch(error => {
                    console.error(error);
                });

        });
    }

    async request(method: string, endpoint: string, data: any, config?: any, donotretry?: boolean): Promise<AxiosResponse> {
        let response = await axios({
            method: method,
            url: BaseURL + endpoint,
            data: data,
            headers: {
                'Cookie': this.Cookie
            },
            ...config
        });
        if (!donotretry && response.status === 302) {
            this.login();
            return this.request(method, endpoint, data, config, true);
        }
        return response;
    }

    async isAuthenticated(): Promise<boolean> {
        let response = await this.request('GET', 'schedule/isAuthenticated', {})
        return response.data.isAuthenticated;
    }
}

export default FlowSavvy;
