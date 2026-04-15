<form onSubmit={handleSignup} autoComplete="on">

  {/* ❗ ФЕЙК ПОЛЕ ДЛЯ ТРИГЕРА */}
  <input
    type="text"
    name="username"
    autoComplete="username"
    style={{ display: 'none' }}
  />

  {/* EMAIL */}
  <input
    name="email"
    type="email"
    autoComplete="username"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
  />

  {/* ❗ ПЕРШИЙ ПАРОЛЬ = current-password */}
  <input
    name="password"
    type="password"
    autoComplete="current-password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
  />

  {/* ❗ ДРУГИЙ ПАРОЛЬ */}
  <input
    name="confirm_password"
    type="password"
    autoComplete="current-password"
    value={confirmPassword}
    onChange={(e) => setConfirmPassword(e.target.value)}
  />

</form>