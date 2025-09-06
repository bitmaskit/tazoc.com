// Queue: https://developers.cloudflare.com/queues/get-started/
export default {
	// https://developers.cloudflare.com/queues/platform/javascript-apis/#messagebatch
	async queue(batch, env): Promise<void> {
		// A queue consumer can make requests to other endpoints on the Internet,
		// write to R2 object storage, query a D1 Database, and much more.
		for (let message of batch.messages) {
			// Process each message (we'll just log these)
			console.log(`message ${message.id} processed: ${JSON.stringify(message.body)}`);
		}
	},
} satisfies ExportedHandler<Env, Error>;
