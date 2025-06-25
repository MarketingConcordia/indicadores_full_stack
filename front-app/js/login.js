document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const erroDiv = document.getElementById('erroLogin');
  
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
  
      const email = document.getElementById('email').value;
      const senha = document.getElementById('senha').value;
  
      try {
        const response = await fetch('http://localhost:8000/api/token/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: senha })
        });
  
        const data = await response.json();
  
        if (response.ok) {
          localStorage.setItem('access_token', data.access);
          localStorage.setItem('refresh_token', data.refresh);
  
          // Buscar tipo de usuário
          const perfilResponse = await fetch('http://localhost:8000/api/me/', {
            method: 'GET',
            headers: {
              'Authorization': 'Bearer ' + data.access,
              'Content-Type': 'application/json'
            }
          });
  
          const perfil = await perfilResponse.json();
  
          if (perfil.perfil === 'master') {
            window.location.href = 'index.html';
          } else if (perfil.perfil === 'gestor') {
            window.location.href = 'indexgestores.html';
          } else {
            erroDiv.textContent = 'Perfil de usuário não reconhecido.';
            erroDiv.classList.remove('hidden');
          }
  
        } else {
          erroDiv.classList.remove('hidden');
        }
      } catch (error) {
        console.error('Erro de conexão:', error);
        erroDiv.classList.remove('hidden');
      }
    });
  });
  