export const adminDevelopers = {
  en: {
    header: {
      title: "Developer API Keys",
    },
    explainer: {
      title: "YoEvent as a Service (EaaS)",
      pre: "Use your API key to call YoEvent endpoints from your own application. Include it in the",
      post: "header with every request. Your plan tier determines the monthly call quota enforced on all keys.",
    },
    revealedKey: {
      banner: "Your new API key. Copy it now. It will not be shown again.",
      copy: "Copy",
      copied: "Copied!",
      dismiss: "I've saved it, dismiss",
    },
    generate: {
      title: "Generate New API Key",
      namePlaceholder: "Key name (e.g. My App Production)",
      generating: "Generating...",
      submit: "Generate Key",
      limitNote: "Maximum 10 active keys per tenant.",
    },
    active: {
      title: "Active Keys ({count})",
      loading: "Loading...",
      empty: "No active API keys. Generate one above.",
      created: "Created {date}",
      lastUsed: "Last used {date}",
      neverUsed: "Never used",
      revokeConfirm: "Revoke?",
      yes: "Yes",
      no: "No",
      revokeTitle: "Revoke key",
    },
    revoked: {
      title: "Revoked Keys ({count})",
      badge: "Revoked",
    },
    toast: {
      generated: "API key generated. Save it now, it won't be shown again.",
      generateFailed: "Failed to generate key.",
      revoked: "API key revoked.",
      revokeFailed: "Failed to revoke key.",
    },
  },
  fr: {
    header: {
      title: "Clés API développeur",
    },
    explainer: {
      title: "YoEvent en tant que service (EaaS)",
      pre: "Utilisez votre clé API pour appeler les points d'accès YoEvent depuis votre propre application. Incluez-la dans l'en-tête",
      post: "à chaque requête. Votre forfait détermine le quota d'appels mensuel appliqué à toutes les clés.",
    },
    revealedKey: {
      banner: "Votre nouvelle clé API. Copiez-la maintenant. Elle ne sera plus jamais affichée.",
      copy: "Copier",
      copied: "Copié !",
      dismiss: "Je l'ai enregistrée, fermer",
    },
    generate: {
      title: "Générer une nouvelle clé API",
      namePlaceholder: "Nom de la clé (ex. Mon appli Production)",
      generating: "Génération...",
      submit: "Générer la clé",
      limitNote: "Maximum 10 clés actives par organisation.",
    },
    active: {
      title: "Clés actives ({count})",
      loading: "Chargement...",
      empty: "Aucune clé API active. Générez-en une ci-dessus.",
      created: "Créée le {date}",
      lastUsed: "Dernière utilisation le {date}",
      neverUsed: "Jamais utilisée",
      revokeConfirm: "Révoquer ?",
      yes: "Oui",
      no: "Non",
      revokeTitle: "Révoquer la clé",
    },
    revoked: {
      title: "Clés révoquées ({count})",
      badge: "Révoquée",
    },
    toast: {
      generated: "Clé API générée. Enregistrez-la maintenant, elle ne sera plus affichée.",
      generateFailed: "Impossible de générer la clé.",
      revoked: "Clé API révoquée.",
      revokeFailed: "Impossible de révoquer la clé.",
    },
  },
};
