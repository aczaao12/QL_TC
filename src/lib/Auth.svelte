<script lang="ts">
  import { onMount } from 'svelte';
  import { auth } from './firebase'; // Import the auth object
  import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

  let isLoginMode = true;
  let email = '';
  let password = '';
  let errorMessage: string | null = null;
  let successMessage: string | null = null;

  function toggleMode() {
    isLoginMode = !isLoginMode;
    errorMessage = null; // Clear messages on mode switch
    successMessage = null;
  }

  async function handleAuth() {
    errorMessage = null;
    successMessage = null;

    try {
      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, email, password);
        successMessage = 'Login successful!';
        console.log('Login successful!');
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        successMessage = 'Registration successful! You are now logged in.';
        console.log('Registration successful!');
      } 
    } catch (error: any) {
      errorMessage = error.message;
      console.error('Authentication error:', error.message);
    }
  }

  onMount(() => {
    // Bootstrap JavaScript components might need initialization if used,
    // but for basic forms, CSS classes are often enough.
  });
</script>

<div class="container d-flex justify-content-center align-items-center min-vh-100 bg-light">
  <div class="card p-4 shadow-sm" style="width: 100%; max-width: 400px;">
    <h2 class="card-title text-center mb-4">{isLoginMode ? 'Login' : 'Register'}</h2>
    <form on:submit|preventDefault={handleAuth}>
      {#if errorMessage}
        <div class="alert alert-danger" role="alert">
          {errorMessage}
        </div>
      {/if}
      {#if successMessage}
        <div class="alert alert-success" role="alert">
          {successMessage}
        </div>
      {/if}

      <div class="mb-3">
        <label for="emailInput" class="form-label">Email address</label>
        <input
          type="email"
          class="form-control"
          id="emailInput"
          bind:value={email}
          required
        />
      </div>
      <div class="mb-3">
        <label for="passwordInput" class="form-label">Password</label>
        <input
          type="password"
          class="form-control"
          id="passwordInput"
          bind:value={password}
          required
        />
        </div>
      <button type="submit" class="btn btn-primary w-100 mb-2">
        {isLoginMode ? 'Login' : 'Register'}
      </button>
      <button type="button" class="btn btn-outline-secondary w-100" on:click={toggleMode}>
        {isLoginMode ? 'Need an account? Register' : 'Already have an account? Login'}
      </button>
    </form>
  </div>
</div>

<style>
  /* No specific styles needed here as Bootstrap handles most of it */
</style>