interface Config {
	port: number;
	host: string;
}

class App {
	private config: Config;

	constructor(config: Config) {
		this.config = config;
	}

	public start() {
		console.log(`Server running on ${this.config.host}:${this.config.port}`);
	}

	private stop() {
		console.log('Server stopped');
	}
}

const app = new App({ port: 3000, host: 'localhost' });
app.start();
