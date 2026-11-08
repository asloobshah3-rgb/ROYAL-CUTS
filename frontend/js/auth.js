(function () {
  const login = document.getElementById('login-form');
  const signup = document.getElementById('signup-form');
  const form = login || signup;
  if (!form) return;
  const feedback = document.getElementById('auth-message');
  const submit = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const endpoint = login ? '/auth/login' : '/auth/register';
    submit.disabled = true;
    window.RC.setMessage(feedback, 'Please wait…');
    try {
      const user = Object.fromEntries(new FormData(form).entries());
      const result = await window.RC.api(endpoint, { method: 'POST', body: user });
      window.RC.setMessage(feedback, 'Signed in successfully.', 'success');
      window.location.assign(result.user.role === 'admin' ? '/admin/' : '/account.html');
    } catch (error) {
      window.RC.setMessage(feedback, error.message, 'error');
    } finally {
      submit.disabled = false;
    }
  });
}());
