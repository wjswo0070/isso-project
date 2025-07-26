require('dotenv').config();  // dotenv 불러오기 (가장 위에 위치)

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000; // Render 환경변수 대응

// 로그인 정보 및 정답 (env에서 불러오기)
const VALID_ID = process.env.VALID_ID;
const VALID_PW = process.env.VALID_PW;
const CORRECT_ANSWER = process.env.CORRECT_ANSWER;

// 세션 유지 시간 (24시간)
const SESSION_DURATION = 24 * 60 * 60 * 1000;

// 정적 파일 제공 (public 폴더)
app.use('/static', express.static(path.join(__dirname, 'public')));

// 미들웨어
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: SESSION_DURATION }
}));

// 세션 만료 확인 함수
function isExpired(req) {
  if (!req.session.loginTime) return true;
  return Date.now() - req.session.loginTime > SESSION_DURATION;
}

// 로그인 페이지
app.get('/', (req, res) => {
  if (req.session.isLoggedIn) return res.redirect('/problem');

  res.cookie('hidden_ID', VALID_ID, {
    httpOnly: false,
    maxAge: SESSION_DURATION
  });

  res.sendFile(path.join(__dirname, 'views', 'part1.html'));
});

// 로그인 처리
app.post('/login', (req, res) => {
  const { id, pw } = req.body;
  if (id === VALID_ID && pw === VALID_PW) {
    req.session.isLoggedIn = true;
    req.session.loginTime = Date.now();
    req.session.isAnswered = false;
    return res.redirect('/problem');
  }
  return res.redirect('/?error=1');
});

// 문제 접근 라우트
app.get('/problem', (req, res) => {
  if (!req.session.isLoggedIn || isExpired(req)) {
    req.session.destroy(() => {});
    return res.redirect('/expired');
  }

  res.cookie('loginTime', req.session.loginTime.toString(), {
    httpOnly: false,
    maxAge: SESSION_DURATION
  });

  res.redirect('/problem-page');
});

// 문제 페이지
app.get('/problem-page', (req, res) => {
  if (!req.session.isLoggedIn || isExpired(req)) {
    req.session.destroy(() => {});
    return res.redirect('/expired');
  }

  res.sendFile(path.join(__dirname, 'views', 'problem.html'));
});

// 정답 제출
app.post('/submit-answer', (req, res) => {
  if (!req.session.isLoggedIn || isExpired(req)) {
    req.session.destroy(() => {});
    return res.redirect('/expired');
  }

  const userAnswer = req.body.answer.trim();
  if (userAnswer === CORRECT_ANSWER) {
    req.session.isAnswered = true;
    return res.redirect('/success');
  } else {
    return res.redirect('/problem-page?error=1');
  }
});

// 성공 페이지
app.get('/success', (req, res) => {
  if (!req.session.isLoggedIn || !req.session.isAnswered || isExpired(req)) {
    return res.redirect('/expired');
  }

  res.sendFile(path.join(__dirname, 'views', 'success.html'));
});

// 다운로드 경로
app.get('/download', (req, res) => {
  const zipPath = path.join(__dirname, 'files', '키케로의 분노.zip');
  res.download(zipPath, '키케로의 분노.zip', err => {
    if (err) {
      console.error('Download failed:', err);
      res.status(500).send('Download error');
    }
  });
});

// 로그아웃
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// 만료 페이지
app.get('/expired', (req, res) => {
  res.send('<h1>ACCESS BLOCKED</h1><p>You are no longer allowed to access this server.</p>');
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
