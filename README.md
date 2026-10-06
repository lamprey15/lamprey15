# 포레스트 플래너

월별·일별 계획, 회사·개인 일정, 할 일과 업무 리뷰를 관리하는 한국어 웹 앱입니다. 기존 하루모아 저장 데이터와 호환됩니다. HTML, CSS, JavaScript만 사용하며 설치할 패키지가 없습니다.

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

## Android APK

`android` 프로젝트는 웹 앱 파일을 APK 안에 포함합니다. 앱은 인터넷 권한을 요청하지 않으며 기록은 Android WebView의 앱 전용 저장 공간에 보관됩니다. 앱 삭제 또는 앱 데이터 삭제 시 기록도 제거되므로 JSON 백업을 사용하세요.

Android SDK 35와 JDK 17 이상이 준비된 환경에서 다음 명령으로 빌드합니다.

```sh
cd /workspace/lamprey15/android
gradle assembleDebug
```

디버그 APK는 개발·직접 설치용입니다. Play Store 배포에는 별도의 비공개 서명 키로 release APK 또는 AAB를 생성해야 합니다.

## 무료 PC·Android 동기화 설정

이 저장소는 GitHub Pages, Firebase Authentication, Cloud Firestore를 이용하는 개인용 동기화 구조를 포함합니다. 결제수단을 연결하지 않은 Firebase Spark 요금제를 사용하면 무료 한도를 넘었을 때 과금되지 않습니다.

1. Firebase Console에서 프로젝트를 만들고 Spark 요금제를 유지합니다.
2. Authentication에서 이메일/비밀번호 로그인을 활성화합니다.
3. Firestore Database를 만든 뒤 `firestore.rules` 내용을 Rules에 게시합니다. 테스트 모드 규칙을 유지하지 마세요.
4. 프로젝트 설정에서 웹 앱을 추가하고 공개 Firebase 구성 객체를 `firebase-config.js`에 입력합니다. 관리자 SDK 키나 서비스 계정 파일은 넣지 마세요.
5. Authentication의 승인된 도메인에 `lamprey15.github.io`가 없으면 추가합니다.
6. `main`에 푸시하면 GitHub Actions가 Pages를 배포합니다. 처음 한 번은 저장소 Settings → Pages에서 GitHub Actions를 배포 소스로 허용해야 할 수 있습니다.

PC에서는 배포 주소를 Chrome 또는 Edge로 연 뒤 메뉴의 **앱 설치**를 사용합니다. Android APK는 같은 배포 주소를 열기 때문에 웹 파일 패치는 PC와 Android에 함께 반영됩니다. Android 네이티브 권한이나 앱 아이콘을 바꾼 경우에만 APK를 다시 설치해야 합니다.

처음 로그인한 계정에는 현재 기기의 로컬 계획을 한 번 업로드합니다. 이후 각 일정은 사용자별 Firestore 문서로 저장되며 다른 일정의 동시 편집은 서로 덮어쓰지 않습니다. 같은 일정을 두 기기에서 동시에 편집하면 Firestore에 마지막으로 도착한 저장이 반영됩니다. Firestore 오프라인 캐시가 변경을 보관하고 연결 복구 시 전송합니다.

## 대시보드와 리뷰

- 대시보드에 월간 달력, 선택한 날의 할 일, 실제 기록 기반 진행률이 표시됩니다. 달력에서 날짜를 누르면 일별 계획을 엽니다.
- 회사별 업무와 개인 일정에서 날짜와 관계없이 해당 분류의 기록을 조회합니다.
- 대시보드 하단에서 회사와 월을 선택해 완료 업무·결과 메모·남은 업무를 확인합니다. 리뷰 보기를 누르면 해당 회사와 기간으로 상세 리뷰가 열립니다. 요약은 기록을 모은 것이며 AI가 생성하지 않습니다.
- 예시 둘러보기는 저장 데이터와 분리된 읽기 전용 미리보기입니다. 내 기록으로 돌아가기를 누르면 원래 기록이 복원됩니다. 예시 모드에서는 저장·삭제·백업·가져오기를 허용하지 않습니다.
- 첨부 디자인의 '이번 달 목표' 자리는 실제 등록된 월간 계획 수를 표시합니다. 별도의 목표 관리 기능은 없습니다.
