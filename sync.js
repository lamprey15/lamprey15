'use strict';

(function () {
  const state = { configured: false, user: null, db: null, unsubscribe: null, applyingRemote: false };
  const emit = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));
  const taskPath = uid => state.db.collection('users').doc(uid).collection('tasks');
  const profilePath = uid => state.db.collection('users').doc(uid);

  function publicTask(task) {
    const { id, title, date, category, kind, status, company, project, notes, time } = task;
    return { id, title, date, category, kind, status, company, project, notes, time };
  }

  async function writeChanges(next, previous) {
    if (!state.user || state.applyingRemote) return;
    const before = new Map(previous.map(task => [task.id, task]));
    const after = new Map(next.map(task => [task.id, task]));
    const changed = next.filter(task => JSON.stringify(publicTask(task)) !== JSON.stringify(publicTask(before.get(task.id) || {})));
    const removed = previous.filter(task => !after.has(task.id));
    if (!changed.length && !removed.length) return;

    const batch = state.db.batch();
    changed.forEach(task => batch.set(taskPath(state.user.uid).doc(task.id), {
      ...publicTask(task),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }));
    removed.forEach(task => batch.delete(taskPath(state.user.uid).doc(task.id)));
    await batch.commit();
  }

  async function initializeAccount(user, localTasks) {
    const profile = profilePath(user.uid);
    const snapshot = await profile.get();
    if (!snapshot.exists) {
      const batch = state.db.batch();
      localTasks.forEach(task => batch.set(taskPath(user.uid).doc(task.id), {
        ...publicTask(task),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }));
      batch.set(profile, { initializedAt: firebase.firestore.FieldValue.serverTimestamp() });
      await batch.commit();
      if (localTasks.length) emit('forest-sync-message', `${localTasks.length}개의 기존 계획을 처음 한 번 클라우드로 옮겼습니다.`);
    }
  }

  function listen(user) {
    if (state.unsubscribe) state.unsubscribe();
    state.unsubscribe = taskPath(user.uid).onSnapshot({ includeMetadataChanges: true }, snapshot => {
      const items = snapshot.docs.map(doc => publicTask({ id: doc.id, ...doc.data() }));
      state.applyingRemote = true;
      emit('forest-cloud-tasks', { items, pending: snapshot.metadata.hasPendingWrites, cached: snapshot.metadata.fromCache });
      state.applyingRemote = false;
    }, error => emit('forest-sync-error', friendlyError(error)));
  }

  function friendlyError(error) {
    const messages = {
      'auth/email-already-in-use': '이미 등록된 이메일입니다. 로그인해 주세요.',
      'auth/invalid-credential': '이메일 또는 비밀번호가 맞지 않습니다.',
      'auth/invalid-email': '올바른 이메일 주소를 입력하세요.',
      'auth/weak-password': '비밀번호는 6자 이상이어야 합니다.',
      'auth/network-request-failed': '인터넷 연결을 확인하세요.',
      'permission-denied': '데이터 접근 권한이 없습니다. 보안 규칙을 확인하세요.'
    };
    return messages[error?.code] || messages[error?.message] || '동기화 중 문제가 발생했습니다.';
  }

  window.CloudSync = {
    get configured() { return state.configured; },
    get user() { return state.user; },
    get applyingRemote() { return state.applyingRemote; },
    async start(localTasks) {
      const config = window.FOREST_FIREBASE_CONFIG;
      if (!config?.apiKey || !config?.projectId || !window.firebase) {
        emit('forest-auth', { configured: false, user: null });
        return;
      }
      try {
        if (!firebase.apps.length) firebase.initializeApp(config);
        state.db = firebase.firestore();
        state.configured = true;
        try { await state.db.enablePersistence({ synchronizeTabs: true }); } catch (error) {
          if (!['failed-precondition', 'unimplemented'].includes(error.code)) throw error;
        }
        firebase.auth().onAuthStateChanged(async user => {
          state.user = user;
          emit('forest-auth', { configured: true, user: user ? { email: user.email, uid: user.uid } : null });
          if (!user) { if (state.unsubscribe) state.unsubscribe(); state.unsubscribe = null; return; }
          try { await initializeAccount(user, typeof localTasks === 'function' ? localTasks() : localTasks); listen(user); }
          catch (error) { emit('forest-sync-error', friendlyError(error)); }
        });
      } catch (error) {
        emit('forest-sync-error', friendlyError(error));
        emit('forest-auth', { configured: false, user: null });
      }
    },
    save(next, previous) { return writeChanges(next, previous).catch(error => emit('forest-sync-error', friendlyError(error))); },
    signIn(email, password) { return firebase.auth().signInWithEmailAndPassword(email, password); },
    signUp(email, password) { return firebase.auth().createUserWithEmailAndPassword(email, password); },
    signOut() { return firebase.auth().signOut(); },
    friendlyError
  };
})();
