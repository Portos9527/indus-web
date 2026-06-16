# SSO SAML INDUS ↔ SimpleSAMLphp (sso.solcera.sol)

## Architecture

```
INDUS (SP)  ──AuthnRequest──▶  SimpleSAMLphp (IdP)  ──▶  IdP en amont (AD/Azure…)
   ▲                                  │                        via l'authsource « solcera-sp »
   └────────── Assertion SAML ────────┘
```

INDUS est un **Service Provider**. SimpleSAMLphp joue le rôle d'**IdP** (il
authentifie l'utilisateur via son authsource `solcera-sp`, puis renvoie une
assertion à INDUS). Le fichier `solcera-sp.xml` fourni est la métadonnée *SP*
de SimpleSAMLphp (son côté amont) — on en a extrait le **certificat de
signature** (déposé dans `backend/saml/idp.crt`).

---

## 1. Côté INDUS (notre app) — déjà fait dans le code

- Le backend lit le certificat depuis `backend/saml/idp.crt` (versionné).
- Endpoints exposés :
  - Démarrage SSO : `GET /api/auth/saml/login`
  - ACS (retour IdP) : `POST /api/auth/saml/acs`
  - Métadonnées SP : `GET /api/auth/saml/metadata`
- Reste à renseigner le `.env` (voir étape 2).

## 2. Configurer `backend/.env` sur la VM

Copier le contenu de **`backend/.env.saml.example`** dans `backend/.env`,
ajuster les valeurs, puis :

```bash
cd "indus web" && git pull && pm2 restart indus-web
```

Le bouton « Connexion Automatique » apparaît automatiquement dès que
`SAML_ENTRY_POINT` + certificat + `SAML_CALLBACK_URL` sont présents
(`GET /api/auth/saml/enabled` renvoie `{enabled:true}`).

> ⚠️ **Vérifier les URL IdP** : ouvrez la page *Federation* de SimpleSAMLphp
> (`https://sso.solcera.sol/simplesaml/`) → métadonnées de l'IdP hébergé, et
> confirmez l'`entityID`, le `SingleSignOnService` (→ `SAML_ENTRY_POINT`) et le
> `SingleLogoutService`. Les valeurs de l'exemple sont les conventions par
> défaut de SimpleSAMLphp.

## 3. Côté SimpleSAMLphp — déclarer INDUS comme SP de confiance

Dans `metadata/saml20-sp-remote.php`, ajouter :

```php
$metadata['https://indus.solcera.sol/api/auth/saml/metadata'] = [
    'AssertionConsumerService' => 'https://indus.solcera.sol/api/auth/saml/acs',
    'NameIDFormat'  => 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',
    // Attributs à LIBÉRER vers INDUS (au moins l'identifiant + nom + mail) :
    'attributes'    => ['uid', 'displayName', 'mail'],
    'simplesaml.nameidattribute' => 'uid',
];
```

La clé du tableau (`entityID`) doit être **identique** à `SAML_ISSUER` du `.env`.
Vous pouvez aussi importer automatiquement la métadonnée via
`https://indus.solcera.sol/api/auth/saml/metadata` (XML parser de SimpleSAMLphp).

Vérifier que l'**IdP hébergé est activé** (`config.php` : `'enable.saml20-idp' => true`)
et que `saml20-idp-hosted.php` utilise bien l'authsource amont (`'auth' => 'solcera-sp'`).

## 4. Attributs / identifiant — point critique

Le NameID SimpleSAMLphp est **`transient`** (différent à chaque session). Si on
s'en servait comme identifiant, un nouvel utilisateur serait créé à chaque
connexion. INDUS utilise donc l'attribut **`SAML_ATTR_LOGIN`** (par défaut `uid`)
comme `nom_session`.

➡️ Régler `SAML_ATTR_LOGIN` sur l'attribut **stable** réellement libéré par
votre IdP. Pour le connaître : SimpleSAMLphp → *Test des sources
d'authentification* → `solcera-sp` → connectez-vous → la page liste les
attributs reçus (`uid`, `sAMAccountName`, `mail`, `displayName`, …).

- `SAML_ATTR_LOGIN` → identifiant unique (clé de compte)
- `SAML_ATTR_NOM`   → nom affiché (`displayName`)
- `SAML_ATTR_MAIL`  → email (`mail`)

## 5. Provisioning

À la première connexion SSO, INDUS crée le compte automatiquement avec le rôle
**Demandeur (0)**. Un admin peut ensuite changer le rôle dans *Administration*.
Un compte désactivé (`actif=0`) est refusé.

## Dépannage

- **« Assertion SAML invalide »** : le certificat IdP ne correspond pas →
  récupérer le certificat de signature dans les métadonnées de l'IdP hébergé
  et remplacer `backend/saml/idp.crt`.
- **Un nouvel utilisateur créé à chaque login** : `SAML_ATTR_LOGIN` pointe un
  attribut absent/non stable (ou retombe sur le NameID transient).
- **Bouton SSO absent** : `GET /api/auth/saml/enabled` → si `false`, il manque
  `SAML_ENTRY_POINT`, le certificat ou `SAML_CALLBACK_URL`.
- **Boucle de redirection / `AuthnRequest` rejetée** : l'`entityID` (`SAML_ISSUER`)
  ne correspond pas à la clé déclarée dans `saml20-sp-remote.php`.
