# 하루모아

월별·일별 계획, 회사·개인 일정, 할 일과 업무 리뷰를 관리하는 한국어 웹 앱입니다. HTML, CSS, JavaScript만 사용하며 설치할 패키지가 없습니다.

## 로컬 실행

```sh
cd /workspace/lamprey15
python3 -m http.server 8000 --bind 127.0.0.1
```

브라우저에서 서버를 열어 사용합니다. 회사나 프로젝트 이름으로 검색한 뒤 모아보기에서 기간을 정하면 완료한 업무, 결과 메모, 다음 할 일이 정리됩니다. 리뷰 복사는 HTTPS 또는 localhost에서 사용하세요.

## 데이터 보관

데이터는 해당 사이트의 브라우저 localStorage에만 저장됩니다. 브라우저나 기기를 바꾸면 공유되지 않습니다. 정기적으로 JSON 백업을 내려받으세요. 백업 가져오기는 기존 기록을 교체합니다. 회사 업무와 개인 정보가 포함된 백업을 공개 저장소에 올리지 마세요. 로그인, 클라우드 동기화, 자동 알림, AI 요약은 포함하지 않습니다.

## GitHub Pages 배포

1. 소스 파일을 GitHub 저장소의 `main` 브랜치에 커밋하고 푸시합니다.
2. Settings → Pages → Build and deployment에서 Deploy from a branch를 선택합니다.
3. `main`과 `/(root)`를 선택하고 저장합니다.
4. GitHub가 표시하는 배포 주소에서 계획 생성, 새로고침 후 유지, 백업 기능을 확인합니다.

배포 파일은 `index.html`, `style.css`, `app.js`이며 빌드 과정은 없습니다. 저장소는 GitHub Pages 소스 공개 범위를 따릅니다. 앱에 입력한 기록은 브라우저에 저장되며 GitHub로 전송하지 않습니다.
