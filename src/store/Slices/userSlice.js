import { createSlice } from "@reduxjs/toolkit";
import { AUTH_URL } from "../constants";
import { showConsole } from "../../assets/assets";
import { apiRequest } from "../../services/api";
import { clearCrmToken } from "../../services/crmAuth";

const initialState = {
  loading: false,

  // Logged-in user information
  user: {},

  // HRCRM user information
  userInfo: {
    id: null,
    stage: null,
    phase: null,
    status: null,
  },

  isAuthenticated: false,
  error: null,
  message: null,
};

const userSlice = createSlice({
  name: "user",

  initialState,

  reducers: {
    loadUserRequest(state) {
      state.loading = true;
      state.isAuthenticated = false;

      state.user = {};

      state.userInfo = {
        id: null,
        stage: null,
        phase: null,
        status: null,
      };

      state.error = null;
      state.message = null;
    },

    loadUserSuccess(state, action) {
      const { user, userInfo } = action.payload;

      state.loading = false;
      state.isAuthenticated = true;

      state.user = user || {};

      state.userInfo = {
        id: userInfo?.id ?? null,
        stage: userInfo?.stage ?? null,
        phase: userInfo?.phase ?? null,
        status: userInfo?.status ?? null,
      };

      state.error = null;
      state.message = null;
    },

    loadUserFailed(state, action) {
      state.loading = false;
      state.isAuthenticated = false;

      state.user = {};

      state.userInfo = {
        id: null,
        stage: null,
        phase: null,
        status: null,
      };

      state.error = action.payload;
    },

    logoutRequest(state) {
      state.loading = true;
    },

    logoutSuccess(state, action) {
      state.loading = false;
      state.isAuthenticated = false;

      state.user = {};

      state.userInfo = {
        id: null,
        stage: null,
        phase: null,
        status: null,
      };

      state.error = null;
      state.message = action.payload;
    },

    logoutFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },

    clearAllErrors(state) {
      state.error = null;
    },
  },
});

// ============================================================
// GET CURRENT USER
// ============================================================

export const getUser = () => {
  return async (dispatch) => {
    dispatch(userSlice.actions.loadUserRequest());

    try {
      const data = await apiRequest({
        endpoint: `${AUTH_URL}?controller=auth`,
        params: {
          action: "me",
        },
        withCredentials: true,
      });

      showConsole && console.log("user", data);

      /*
        Backend response:

        {
          "user": {
            "email": "user@example.com"
          },
          "userInfo": {
            "id": "...",
            "stage": "Joining",
            "phase": "Employment",
            "status": "Joining Confirmed"
          }
        }

        OR if your backend returns:
        
        {
          "user": {
            "email": "user@example.com"
          },
          "id": "...",
          "stage": "Joining",
          "phase": "Employment",
          "status": "Joining Confirmed"
        }
      */

      const userInfo = data.userInfo || {
        id: data.id ?? null,
        stage: data.stage ?? null,
        phase: data.phase ?? null,
        status: data.status ?? null,
      };

      dispatch(
        userSlice.actions.loadUserSuccess({
          user: data.user || {},

          userInfo,
        }),
      );

      dispatch(userSlice.actions.clearAllErrors());
    } catch (error) {
      console.log("Full Error:", error.response);

      localStorage.setItem("displayIntro", "true");

      let message = "Something went wrong. Please try again.";

      if (error.response) {
        const status = error.response?.status;

        const backendError = error.response?.data?.error || "";

        switch (status) {
          case 404:
            message = null;
            break;

          case 401:
            if (backendError.includes("Invalid token")) {
              message = "Your session expired. Please login again.";
            } else if (backendError.includes("Unauthorized user")) {
              message = "You don’t have permission to access this area.";
            } else if (
              backendError.includes("email missing") ||
              backendError.includes("Token and email both missing")
            ) {
              message = "Please login again.";
            } else {
              message = "Authentication failed.";
            }

            break;

          case 400:
            if (backendError.includes("Token and email both missing")) {
              message = "";
            } else {
              message = backendError || "Invalid request.";
            }

            break;

          case 500:
            message = "Server error. Please try again later.";
            break;

          case 503:
            message = "Unable to verify your account. Please try again later.";
            break;

          default:
            message = backendError || "Something went wrong on our side.";
        }
      } else if (error.request) {
        message = "Network error. Please check your internet connection.";
      }

      dispatch(userSlice.actions.loadUserFailed(message));
    }
  };
};

// ============================================================
// LOGOUT
// ============================================================

export const logout = () => {
  return async (dispatch) => {
    dispatch(userSlice.actions.logoutRequest());

    try {
      const data = await apiRequest({
        endpoint: `${AUTH_URL}?controller=auth`,
        params: {
          action: "logout",
        },
        withCredentials: true,
      });

      // Clear the in-memory CRM access token so no stale token is
      // reused after the next login.
      clearCrmToken();

      // Clear all localStorage
      localStorage.clear();

      // Show intro again after logout
      localStorage.setItem("displayIntro", "true");

      dispatch(userSlice.actions.logoutSuccess(data?.message));

      dispatch(userSlice.actions.clearAllErrors());
    } catch (error) {
      dispatch(
        userSlice.actions.logoutFailed(
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Logout Failed",
        ),
      );
    }
  };
};

// ============================================================
// CLEAR USER ERRORS
// ============================================================

export const clearAllUserErrors = () => {
  return (dispatch) => {
    dispatch(userSlice.actions.clearAllErrors());
  };
};

// ============================================================
// ACTIONS
// ============================================================

export const userAction = userSlice.actions;

// ============================================================
// SELECTORS
// ============================================================

export const selectUser = (state) => state.user.user;

export const selectUserInfo = (state) => state.user.userInfo;

export const selectIsAuthenticated = (state) => state.user.isAuthenticated;

export const selectUserLoading = (state) => state.user.loading;

export const selectUserError = (state) => state.user.error;

export const selectUserId = (state) => state.user.userInfo?.id;

export const selectUserStage = (state) => state.user.userInfo?.stage;

export const selectUserPhase = (state) => state.user.userInfo?.phase;

export const selectUserStatus = (state) => state.user.userInfo?.status;

export default userSlice.reducer;



// <?php

// require_once __DIR__ . '/../vendor/autoload.php';
// require_once __DIR__ . '/../models/User.php';
// $allowedOrigins = [
//     'https://app.hrcrm.ai',
//     'http://localhost:5173'
// ];

// $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

// $isAllowedOrigin = in_array($origin, $allowedOrigins, true)
//     || (bool) preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#', $origin);

// if ($isAllowedOrigin && $origin !== '') {
//     header("Access-Control-Allow-Origin: $origin");
//     header("Access-Control-Allow-Credentials: true");
//     header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
//     header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
//     header("Vary: Origin");
// }

// // Handle preflight request
// if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
//     http_response_code(204);
//     exit;
// }

// header('Content-Type: application/json; charset=utf-8');
// use PHPMailer\PHPMailer\Exception;
// use Google\Client as GoogleClient;
// use Firebase\JWT\JWT;
// use Firebase\JWT\Key;

// class AuthController
// {
//     private $jwt_secret;
//     private $user;

//     public function __construct()
//     {
//         $this->user = new User();
//         $this->jwt_secret = "4d698f66f4490450ed254048d40199eaf10026ab35eda84be344e5121b62d43f";
//         if (session_status() !== PHP_SESSION_ACTIVE) {
//             session_set_cookie_params([
//                 'lifetime' => 0,
//                 'path' => '/',
//                 'secure' => true,
//                 'httponly' => true,
//                 'samesite' => 'None',
//             ]);
//             session_start();
//         }
//     }

//     // 🔹 Get logged-in user (from JWT cookie)
//     public function me()
//     {
//         header('Cache-Control: no-store');
//         try {
//             $identity = $this->appIdentity();
//             $subject = $this->lookupSubject($identity['email'], true, $identity);
//             $profile = $subject['profile'];
//             $response = [
//                 'user' => (object) $identity,
//                 'id' => $subject['id'],
//                 'subject_type' => $subject['type'],
//                 'stage' => !empty($profile['stage']) ? $profile['stage']
//                     : ($subject['type'] === 'candidate' ? 'candidate' : null),
//                 'phase' => $profile['phase'] ?? null,
//                 'status' => $profile['status'] ?? null,
//             ];
//             if ($subject['id'] !== null) {
//                 $response['crm_access_token'] = $this->makeCrmToken($subject);
//                 $response['crm_access_token_expires_in'] = 600;
//             }
//             echo json_encode($response);
//         } catch (UnexpectedValueException $e) {
//             $this->jsonError('Invalid token', 401);
//         } catch (DomainException $e) {
//             $this->jsonError('Unauthorized user', 403);
//         } catch (RuntimeException $e) {
//             $this->jsonError('HRCRM verification failed', 503);
//         } catch (Throwable $e) {
//             $this->jsonError('Unable to load login', 500);
//         }
//     }

//     // 🔹 Google Login: redirect to Google auth page
//     public function googleLogin()
//     {
//         try {
//             $client = new GoogleClient();
//             $client->setClientId('842559391916-i2hq0thd3hnsj90mr3mvrr4i4mtqoou3.apps.googleusercontent.com');
//             $client->setClientSecret('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');
//             $client->setRedirectUri('https://app.hrcrm.ai/public/index.php?controller=auth&action=googleCallback');
//             $client->addScope(['email', 'profile']);
//             $client->setState($this->beginOAuth('google'));
//             $authUrl = $client->createAuthUrl();
//             header("Location: $authUrl");
//             exit;
//         } catch (Throwable $e) {
//             $this->jsonError('Google login could not start', 500);
//         }
//     }

//     // 🔹 Google callback
//     public function googleCallback()
//     {
//         try {
//             $redirectUrl = $this->finishOAuth('google');
//             if (!isset($_GET['code'])) {
//                 http_response_code(400);
//                 echo "No Google authorization code received.";
//                 exit;
//             }

//             $client = new GoogleClient();
//             $client->setClientId('842559391916-i2hq0thd3hnsj90mr3mvrr4i4mtqoou3.apps.googleusercontent.com');
//             $client->setClientSecret('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');
//             $client->setRedirectUri('https://app.hrcrm.ai/public/index.php?controller=auth&action=googleCallback');

//             // Exchange code for token
//             $token = $client->fetchAccessTokenWithAuthCode($_GET['code']);

//             if (isset($token['error'])) {
//                 http_response_code(400);
//                 echo "Google login failed: " . ($token['error_description'] ?? 'Unknown error');
//                 exit;
//             }

//             $client->setAccessToken($token['access_token']);

//             // Get Google user data
//             $googleUser = $client->verifyIdToken($token['id_token']);

//             if (!$googleUser) {
//                 http_response_code(400);
//                 echo "Invalid Google token";
//                 exit;
//             }
//             if (empty($googleUser['email_verified'])
//                 || empty($googleUser['sub'])
//                 || !filter_var($googleUser['email'] ?? '', FILTER_VALIDATE_EMAIL)) {
//                 throw new DomainException('Google did not provide a verified email.');
//             }
//             $identity = [
//                 'id' => (string) $googleUser['sub'],
//                 'provider' => 'google',
//                 'email' => strtolower((string) $googleUser['email']),
//                 'name' => (string) ($googleUser['name'] ?? ''),
//                 'profile_pic' => (string) ($googleUser['picture'] ?? ''),
//             ];
//             $subject = $this->lookupSubject($identity['email'], true, $identity);
//             $this->issueAppCookie('google', (string) $googleUser['sub'], $identity, $subject);
//             header('Location: ' . $redirectUrl);
//             exit;
//         } catch (DomainException $e) {
//             $this->jsonError('Google login verification failed', 400);
//         } catch (RuntimeException $e) {
//             $this->jsonError('HRCRM verification failed', 503);
//         } catch (Throwable $e) {
//             $this->jsonError('Google login failed', 500);
//         }
//     }
//     public function microsoftLogin()
//     {
//         try {

//             $clientId = '51c4a942-4d08-438f-880c-3befb48041f3';

//             $tenantId = 'common';

//             $redirectUri = 'https://app.hrcrm.ai/microsoft-callback';

//             $state = $this->beginOAuth('microsoft');

//             $params = [
//                 'client_id'     => $clientId,
//                 'response_type' => 'code',
//                 'redirect_uri'  => $redirectUri,
//                 'response_mode' => 'query',
//                 'scope'         => 'openid profile email User.Read',
//                 'state'         => $state
//             ];

//             $authUrl =
//                 "https://login.microsoftonline.com/$tenantId/oauth2/v2.0/authorize?"
//                 . http_build_query($params);

//             header("Location: $authUrl");
//             exit;

//         } catch (Throwable $e) {
//             $this->jsonError('Microsoft login could not start', 500);
//         }
//     }
//     public function microsoftCallback()
//     {
//         try {
//             $redirectUrl = $this->finishOAuth('microsoft');
//             if (!isset($_GET['code'])) {
//                 http_response_code(400);
//                 echo "No Microsoft authorization code received.";
//                 exit;
//             }

//             $clientId     = '51c4a942-4d08-438f-880c-3befb48041f3';
//             $clientSecret = '4j38Q~LTD0oWHaYXppLRmeGX2oo.7RO~RC8fUcBg';
//             $tenantId     = 'common';
//             $redirectUri = 'https://app.hrcrm.ai/microsoft-callback';

//             // 🔹 Exchange authorization code for access token
//             $tokenResponse = $this->curlPost(
//                 "https://login.microsoftonline.com/$tenantId/oauth2/v2.0/token",
//                 [
//                     'client_id'     => $clientId,
//                     'client_secret' => $clientSecret,
//                     'code'          => $_GET['code'],
//                     'redirect_uri'  => $redirectUri,
//                     'grant_type'    => 'authorization_code'
//                 ]
//             );

//             if (!isset($tokenResponse['access_token'])) {
//                 http_response_code(400);
//                 echo "Microsoft token exchange failed";
//                 exit;
//             }

//             $accessToken = $tokenResponse['access_token'];

//             // 🔹 Fetch Microsoft user profile
//             $user = $this->curlGet(
//                 'https://graph.microsoft.com/v1.0/me',
//                 $accessToken
//             );

//             if (!isset($user['id'])) {
//                 http_response_code(400);
//                 echo "Failed to fetch Microsoft user";
//                 exit;
//             }

//             $email = $user['mail'] ?? $user['userPrincipalName'] ?? '';
//             if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
//                 throw new DomainException('Microsoft did not provide an email.');
//             }
//             $identity = [
//                 'id' => (string) $user['id'],
//                 'provider' => 'microsoft',
//                 'email' => strtolower((string) $email),
//                 'name' => (string) ($user['displayName'] ?? ''),
//                 'profile_pic' => '',
//             ];
//             $subject = $this->lookupSubject($identity['email'], true, $identity);
//             $this->issueAppCookie('microsoft', (string) $user['id'], $identity, $subject);
//             header('Location: ' . $redirectUrl);
//             exit;

//         } catch (DomainException $e) {
//             $this->jsonError('Microsoft login verification failed', 400);
//         } catch (RuntimeException $e) {
//             $this->jsonError('HRCRM verification failed', 503);
//         } catch (Throwable $e) {
//             $this->jsonError('Microsoft login failed', 500);
//         }
//     }
//     private function beginOAuth(string $provider): string
//     {
//         $state = bin2hex(random_bytes(32));
//         $_SESSION['hrcrm_oauth'] = [
//             'state' => $state,
//             'provider' => $provider,
//             'frontend' => $this->allowedFrontend($_GET['frontend'] ?? ''),
//             'created' => time(),
//         ];
//         session_regenerate_id(true);
//         return $state;
//     }

//     private function finishOAuth(string $provider): string
//     {
//         $stored = $_SESSION['hrcrm_oauth'] ?? null;
//         unset($_SESSION['hrcrm_oauth']);
//         $submitted = (string) ($_GET['state'] ?? '');
//         if (!is_array($stored) || $submitted === ''
//             || !hash_equals((string) ($stored['state'] ?? ''), $submitted)
//             || ($stored['provider'] ?? '') !== $provider
//             || time() - (int) ($stored['created'] ?? 0) > 600) {
//             throw new DomainException('Invalid OAuth state.');
//         }
//         return $this->allowedFrontend($stored['frontend'] ?? '');
//     }

//     private function allowedFrontend($url): string
//     {
//         $parts = parse_url((string) $url);
//         if (is_array($parts) && empty($parts['user']) && empty($parts['pass'])) {
//             $scheme = $parts['scheme'] ?? '';
//             $host = $parts['host'] ?? '';

//             if ($scheme === 'https'
//                 && $host === 'app.hrcrm.ai'
//                 && !isset($parts['port'])) {
//                 return (string) $url;
//             }

//             if (in_array($scheme, ['http', 'https'], true)
//                 && in_array($host, ['localhost', '127.0.0.1'], true)) {
//                 return (string) $url;
//             }
//         }
//         return 'https://app.hrcrm.ai/';
//     }

//     private function lookupSubject(string $email, bool $allowMissing, array $identity = []): array
//     {
//         $response = json_decode($this->user->verifyUser(strtolower($email)), true);
//         if (!is_array($response) || !array_key_exists('success', $response)) {
//             throw new RuntimeException('CRM subject lookup failed.');
//         }
//         if ($response['success'] === false
//             && ($response['message'] ?? '') === 'User information was not found.'
//             && $allowMissing) {
//             if (!$identity) {
//                 throw new RuntimeException('A verified login identity is required to create a candidate.');
//             }
//             $response = json_decode($this->user->provisionCandidate(
//                 $this->makeProvisionToken($identity)
//             ), true);
//         }
//         if ($response['success'] !== true || !is_array($response['data'] ?? null)) {
//             throw new DomainException('CRM subject is unavailable.');
//         }
//         $profile = $response['data'];
//         $type = $profile['subject_type'] ?? null;
//         $id = $profile['id'] ?? null;
//         if (!in_array($type, ['candidate', 'employee'], true)
//             || !is_string($id) || $id === '') {
//             throw new RuntimeException('CRM did not return a verified subject.');
//         }
//         return ['type' => $type, 'id' => $id, 'profile' => $profile];
//     }

//     private function makeProvisionToken(array $identity): string
//     {
//         $provider = (string) ($identity['provider'] ?? '');
//         $providerId = (string) ($identity['id'] ?? '');
//         $email = strtolower((string) ($identity['email'] ?? ''));
//         if (!in_array($provider, ['google', 'microsoft'], true)
//             || $providerId === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
//             throw new DomainException('A verified provider identity is required.');
//         }
//         $now = time();
//         return JWT::encode([
//             'iss' => 'app.hrcrm.ai',
//             'aud' => 'flight.hrcrm.ai',
//             'typ' => 'crm_provision',
//             'sub' => $provider . ':' . $providerId,
//             'email' => $email,
//             'email_verified' => true,
//             'name' => (string) ($identity['name'] ?? ''),
//             'iat' => $now,
//             'nbf' => $now,
//             'exp' => $now + 120,
//             'jti' => bin2hex(random_bytes(16)),
//         ], $this->crmPrivateKey(), 'RS256');
//     }

//     private function issueAppCookie(
//         string $provider,
//         string $providerId,
//         array $identity,
//         array $subject
//     ): void {
//         session_regenerate_id(true);
//         $now = time();
//         $jti = bin2hex(random_bytes(24));
//         $_SESSION['hrcrm_login_jti'] = $jti;
//         $payload = [
//             'iss' => 'app.hrcrm.ai',
//             'aud' => 'app.hrcrm.ai',
//             'typ' => 'app_session',
//             'sub' => $provider . ':' . $providerId,
//             'crm_sub' => $subject['id'] === null ? null
//                 : $subject['type'] . ':' . $subject['id'],
//             'iat' => $now,
//             'nbf' => $now,
//             'exp' => $now + 43200,
//             'jti' => $jti,
//             'data' => $identity,
//         ];
//         setcookie('token', JWT::encode($payload, $this->jwt_secret, 'HS256'), [
//             'expires' => $payload['exp'],
//             'path' => '/',
//             'secure' => true,
//             'httponly' => true,
//             'samesite' => 'None',
//         ]);
//     }

//     public function appIdentity(): array
//     {
//         $token = $_COOKIE['token'] ?? '';
//         if (!is_string($token) || $token === '') {
//             throw new UnexpectedValueException('Missing login cookie.');
//         }
//         try {
//             $claims = JWT::decode($token, new Key($this->jwt_secret, 'HS256'));
//         } catch (Throwable $e) {
//             throw new UnexpectedValueException('Invalid login cookie.', 0, $e);
//         }
//         if (($claims->iss ?? '') !== 'app.hrcrm.ai'
//             || ($claims->aud ?? '') !== 'app.hrcrm.ai'
//             || ($claims->typ ?? '') !== 'app_session'
//             || !is_string($claims->sub ?? null)
//             || !preg_match('/^(google|microsoft):.+$/', $claims->sub)
//             || !is_string($claims->jti ?? null)
//             || !hash_equals((string) ($_SESSION['hrcrm_login_jti'] ?? ''), $claims->jti)
//             || !filter_var($claims->data->email ?? '', FILTER_VALIDATE_EMAIL)) {
//             throw new UnexpectedValueException('Invalid login claims.');
//         }
//         return [
//             'id' => explode(':', $claims->sub, 2)[1],
//             'provider' => explode(':', $claims->sub, 2)[0],
//             'email' => strtolower((string) $claims->data->email),
//             'name' => (string) ($claims->data->name ?? ''),
//             'profile_pic' => (string) ($claims->data->profile_pic ?? ''),
//         ];
//     }

//     private function makeCrmToken(array $subject): string
//     {
//         if ($subject['id'] === null) {
//             throw new DomainException('A CRM subject is required.');
//         }
//         $now = time();
//         $claims = [
//             'iss' => 'app.hrcrm.ai',
//             'aud' => 'flight.hrcrm.ai',
//             'typ' => 'crm_access',
//             'sub' => $subject['type'] . ':' . $subject['id'],
//             'iat' => $now,
//             'nbf' => $now,
//             'exp' => $now + 600,
//             'jti' => bin2hex(random_bytes(16)),
//         ];
//         return JWT::encode($claims, $this->crmPrivateKey(), 'RS256');
//     }

//     private function crmPrivateKey(): string
//     {
//         return <<<'CRM_ACCESS_PRIVATE_KEY'
// -----BEGIN PRIVATE KEY-----
// MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQD1KhNmjuUBHf1y
// zVp5x3ipjjLuP1rdF1ZrtdobgdAkzolg1v7UQg2qu6TcDppJJbEH6nLIEaXTO5aN
// zbfCsatiVUp/f49vVvhvdw6znQZsgfWrjqagftlY5tH/BfqDOocPjAV0NcjauiFg
// o9m/VfcdHWmymbcUmHnMSyXf1lSL+MdKt9lOFf7rvKsF44G5azvqUPTBahU6iRuv
// VIUiVmvHM1b4UjProRurEpJQ4vUHyweH/ZojnKtsxqtQ999nXQpwxBMtR+IJk1L4
// btxuCxQttx0vm05pgRmufe6DqnXWxYDHaxHsNedb9mK+KoQqcxMn1wS8r0lUxx3n
// CrCq2P3jAgMBAAECggEAX82jay5n2vnnMteAhZonUsrYqDVlwoP+J3UW2CzwM5Hq
// KUeaqUNup8tP7xZdwDvUZC1/0SLkVBkzChLbvl9Dg9eklxI38OBhkN1Lh3DTM8/N
// Os8x2gH32T/JzAiADovuf2rOLs1dwet+Y49j5dsoB96YkUx0OL4kymqLUF8nBtLa
// 7QkuA6R+EeBj5ZUib1LmsXuwoRgEzgvM3aSVG/EIaurFFW8bLVLYhttN2EC3/bHq
// KK50Wblop+f5K+7qvcj6qWHx4tJNmQOKSlN5C408b0HM/G4XZNhTZUuo1Nay1b+2
// y5NkunqGtQVcRCVRH+/CJG803Z6xJjWV7Xdv87/jcQKBgQD+Ap+gtyjHmpFD9bjq
// ofEhJxKrYyJkLieTgHtdDPWaMM1bBQ3QMtX/SS7HRiYCISN3YSBkO4oPHCXte797
// VKJaku03HGDb05Jb62J0FUp/y4fiVtpMNcsWUEqwgkmcUeAXQ2YgIusxZaHG79bQ
// jVYw2YUCJfKOm4tP9hFPhGvOZwKBgQD3FbaWtF68D8Agc3UPmZze7BVhpqUyMoAC
// zPjWMLTDJ1Rzdid0aTloxog96+eMvJymGOdGvPjRHwVfF0Dru6+geA2QyasafWeN
// SyqkX3ygVXyyekeyn6vvR5QVRrxlrg34jAOpdLE9J2kgsvEbgCfCS+hl+1KF72e0
// uHuI0p7vJQKBgC9N88ZtddW+bmE2qMphgFOJQEvUuXnosowguFi66h5eClByH4Fv
// hjT1vxVzde6dl0pLN0oTYIGx30pb6mwgdd/iTvUdfthRjYc6zeoKcQZdtB+txxe8
// SOcN6ur2SJkpEk+iyKkhd6WKZNd0oQ/T0oJkcAXXZVWzl/07OTwS0DTvAoGAVr1x
// pwBVDZI98WZ23u4fawbYDrrw3WlrFRCd/puEqcoB1LLS8QQLmmOv6oUJeZexKoIt
// luC6PLe2LAa+zMLLyfq7UGvrvFXv52NO6ft3hdXc+87/oo55TnwDWWDGvK9Yyjtl
// AbUsj3ppZohLKktYKdZ6FGshMlG0R3ZIL+U41F0CgYB9qxMCtbOuajK9erJIviDm
// 8sLDuYVbUMJ8v4jhLJsM8prWyFcx59+n7uPhN/iQOo4Ay13YlbLw7RQjT/24jzcy
// h3/Q/pE3fPlxn+xiNaxPQlKfqQLfitJme1ijNDEigImGnHq/QJn6qnZjX9Oo1a6Z
// hvu8YIjCSeiaQ3pMDOg7Lw==
// -----END PRIVATE KEY-----
// CRM_ACCESS_PRIVATE_KEY;
//     }

//     private function jsonError(string $message, int $status): void
//     {
//         http_response_code($status);
//         echo json_encode(['error' => $message]);
//     }

//     // 🔹 Logout
//     public function logout()
//     {
//         unset($_SESSION['hrcrm_login_jti'], $_SESSION['hrcrm_oauth']);
//         session_regenerate_id(true);
//         setcookie("token", "", [
//             'expires' => time() - 3600,
//             'path' => '/',
//             'secure' => true,
//             'httponly' => true,
//             'samesite' => 'None'
//         ]);

//         echo json_encode(['message' => 'Logged out successfully']);
//     }
//     private function curlPost(string $url, array $data): array
//     {
//         $ch = curl_init($url);

//         curl_setopt_array($ch, [
//             CURLOPT_POST            => true,
//             CURLOPT_POSTFIELDS      => http_build_query($data),
//             CURLOPT_RETURNTRANSFER  => true,
//             CURLOPT_TIMEOUT         => 30,
//             CURLOPT_SSL_VERIFYPEER  => true,
//             CURLOPT_HTTPHEADER      => [
//                 'Content-Type: application/x-www-form-urlencoded'
//             ]
//         ]);

//         $response = curl_exec($ch);

//         if ($response === false) {
//             throw new \Exception('cURL POST Error: ' . curl_error($ch));
//         }

//         curl_close($ch);

//         return json_decode($response, true) ?? [];
//     }
//     private function curlGet(string $url, string $accessToken): array
//     {
//         $ch = curl_init($url);

//         curl_setopt_array($ch, [
//             CURLOPT_RETURNTRANSFER  => true,
//             CURLOPT_TIMEOUT         => 30,
//             CURLOPT_SSL_VERIFYPEER  => true,
//             CURLOPT_HTTPHEADER      => [
//                 "Authorization: Bearer $accessToken",
//                 "Accept: application/json"
//             ]
//         ]);

//         $response = curl_exec($ch);

//         if ($response === false) {
//             throw new \Exception('cURL GET Error: ' . curl_error($ch));
//         }

//         curl_close($ch);

//         return json_decode($response, true) ?? [];
//     }
// }
