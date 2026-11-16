(() => {
  'use strict';
  const repo = 'yeonsungai27-art/yeonsungai27-art.github.io';
  const list = document.querySelector('#board-list');
  const search = document.querySelector('#board-search');
  const count = document.querySelector('#board-count');
  const previous = document.querySelector('#board-prev');
  const next = document.querySelector('#board-next');
  const pageLabel = document.querySelector('#board-page');
  let page = 1;
  let posts = [];
  let hasNext = false;
  let loading = false;
  const date = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul' });
  function state(message) {
    const p = document.createElement('p');
    p.className = 'board-state';
    p.textContent = message;
    list.replaceChildren(p);
  }
  function render() {
    const query = search.value.trim().toLocaleLowerCase('ko');
    const matches = posts.filter(post => `${post.title} ${post.user.login}`.toLocaleLowerCase('ko').includes(query));
    count.textContent = `현재 목록 ${matches.length}개`;
    list.replaceChildren();
    if (!matches.length) {
      state(query ? '검색 결과가 없습니다. 다른 검색어를 입력해주세요.' : '아직 게시글이 없습니다. 첫 이야기를 남겨주세요!');
      return;
    }
    for (const post of matches) {
      const link = document.createElement('a');
      link.className = 'board-post';
      // Construct trusted destinations; never inject user-authored HTML.
      link.href = `https://github.com/${repo}/issues/${post.number}`;
      const title = document.createElement('strong');
      title.textContent = post.title;
      const meta = document.createElement('span');
      meta.className = 'board-meta';
      meta.textContent = `#${post.number} · ${post.user.login} · ${date.format(new Date(post.created_at))} · 댓글 ${post.comments}`;
      link.append(title, meta);
      list.append(link);
    }
  }
  async function load(targetPage) {
    if (loading) return;
    loading = true;
    previous.disabled = next.disabled = true;
    list.setAttribute('aria-busy', 'true');
    state('게시글을 불러오는 중입니다…');
    count.textContent = '';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(`https://api.github.com/repos/${repo}/issues?state=open&sort=created&direction=desc&per_page=30&page=${targetPage}`, {
        headers: { Accept: 'application/vnd.github+json' }, signal: controller.signal
      });
      if (!response.ok) throw new Error(String(response.status));
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Invalid response');
      posts = data.filter(post => !post.pull_request);
      page = targetPage;
      hasNext = /rel="next"/.test(response.headers.get('link') || '');
      pageLabel.textContent = `${page} 페이지`;
      render();
    } catch {
      state('게시글을 불러오지 못했습니다. 아래 ‘게시판 전체 보기’를 이용하거나 다시 시도해주세요.');
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.textContent = '다시 불러오기';
      retry.addEventListener('click', () => load(targetPage));
      list.append(retry);
    } finally {
      clearTimeout(timeout);
      loading = false;
      list.setAttribute('aria-busy', 'false');
      previous.disabled = page <= 1;
      next.disabled = !hasNext;
    }
  }
  search.addEventListener('input', () => { if (!loading) render(); });
  previous.addEventListener('click', () => load(page - 1));
  next.addEventListener('click', () => load(page + 1));
  load(1);
})();
