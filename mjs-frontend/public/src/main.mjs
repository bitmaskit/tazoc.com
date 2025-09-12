// public/src/main.mjs
async function refresh() {
	const r = await fetch('/api/me', { credentials: 'include' });
	const data = await r.json();
	document.getElementById('status').classList.add('hidden');
	if (data.authenticated) {
		document.getElementById('authed').classList.remove('hidden');
		document.getElementById('anon').classList.add('hidden');
		document.getElementById('avatar').src = data.user.avatar_url;
		document.getElementById('welcome').textContent = `Hello ${data.user.name ?? data.user.login}!`;
	} else {
		document.getElementById('authed').classList.add('hidden');
		document.getElementById('anon').classList.remove('hidden');
	}
}
document.getElementById('login').addEventListener('click', () => (location.href = '/api/login'));
document.getElementById('logout').addEventListener('click', async () => {
	await fetch('/api/logout', { method: 'POST', credentials: 'include' });
	refresh();
});
refresh();
