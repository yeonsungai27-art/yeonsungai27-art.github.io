# ZERO° 비공개 메시지 서버

GitHub Pages의 `#board` 입력 폼은 별도 서버에 메시지를 저장합니다. GitHub Issues에는 메시지를 올리지 않습니다.

- 서버: https://zero-private-messages.treasuredpaint.chatgpt.site
- 운영자: `/admin`에서 ChatGPT 계정으로 로그인. 서버 환경변수 `ADMIN_EMAIL`과 로그인 이메일이 일치해야만 조회·답변·삭제가 가능합니다.
- 방문자: 글을 보낸 뒤 발급되는 비밀 확인 링크에서 자기 글과 답변을 확인하고 삭제할 수 있습니다. 확인 키는 URL fragment에 있고 서버에는 해시만 저장합니다.
- 저장소: Cloudflare D1. 초기 스키마는 `drizzle/0000_messages.sql`.
- 제한: 이름은 자기 기입 방식이며 실명 인증이 아닙니다. 답변 알림 이메일은 발송하지 않습니다. 작성자는 확인 링크를 보관해야 합니다.
- 테스트: Node.js 24 이상에서 `npm test`.

서버의 배포 원본은 Sites 소스 저장소에서 관리하며, 이 폴더는 GitHub에도 남기는 동일 코드 사본입니다. 서버의 `ADMIN_EMAIL` 값과 인증 비밀은 이 저장소에 저장하지 않습니다.
