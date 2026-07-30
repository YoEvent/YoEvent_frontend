"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Lang = "fr" | "en";

const CONTROL_ROWS: { field: [string, string]; value: [string, string] }[] = [
  { field: ["Système", "System"], value: ["YowEvent", "YowEvent"] },
  { field: ["Document", "Document"], value: ["Conditions générales d'utilisation et de services", "Terms of Use and Services"] },
  { field: ["Version", "Version"], value: ["1.0", "1.0"] },
  { field: ["Statut", "Status"], value: ["Bêta publiée", "Published Beta"] },
  { field: ["Date de publication", "Publication date"], value: ["30 juillet 2026", "30 July 2026"] },
  { field: ["Éditeur", "Operator"], value: ["Yowyob Inc. Ltd", "Yowyob Inc. Ltd"] },
  { field: ["Langues", "Languages"], value: ["Français et anglais", "French and English"] },
  { field: ["Canaux", "Channels"], value: ["Web, PWA, mobile, kiosks/check-in, API, webhooks et domaines personnalisés", "Web, PWA, mobile, kiosks/check-in, API, webhooks and custom domains"] },
];

const LEGAL_REFS: [string, string][] = [
  ["Loi camerounaise n° 2024/017 du 23 décembre 2024 relative à la protection des données à caractère personnel et textes d'application applicables.", "Cameroon Law No. 2024/017 of 23 December 2024 relating to personal data protection and applicable implementing instruments."],
  ["Loi n° 2010/021 du 21 décembre 2010 régissant le commerce électronique et décret n° 2011/1521/PM du 15 juin 2011.", "Law No. 2010/021 of 21 December 2010 governing electronic commerce and Decree No. 2011/1521/PM of 15 June 2011."],
  ["Loi n° 2010/012 du 21 décembre 2010 relative à la cybersécurité et à la cybercriminalité, telle que modifiée ou remplacée.", "Law No. 2010/012 of 21 December 2010 on cybersecurity and cybercrime, as amended or replaced."],
  ["Loi n° 2011/012 du 6 mai 2011 portant protection du consommateur, selon son champ d'application.", "Law No. 2011/012 of 6 May 2011 on consumer protection, within its applicable scope."],
  ["Loi n° 2000/011 du 19 décembre 2000 relative au droit d'auteur et aux droits voisins, Accord de Bangui de l'OAPI et Convention de Berne.", "Law No. 2000/011 of 19 December 2000 on copyright and neighbouring rights, the OAPI Bangui Agreement and the Berne Convention."],
  ["Règles camerounaises, OHADA et territoriales applicables aux contrats, sociétés, paiements, fiscalité, publicité, sécurité des lieux, spectacles, billetterie, emploi, assurances, transport et protection civile.", "Applicable Cameroonian, OHADA and territorial rules on contracts, companies, payments, taxation, advertising, venue safety, performances, ticketing, employment, insurance, transport and civil protection."],
];

const DEFINITIONS: [string, string][] = [
  ["Événement", "activité présentielle, en ligne ou hybride publiée ou gérée via YowEvent."],
  ["Organisateur", "personne ou organisation qui conçoit, publie, finance ou contrôle l'événement."],
  ["Participant", "personne inscrite, invitée, acheteuse ou bénéficiaire d'un accès."],
  ["Billet", "preuve numérique ou physique d'un droit d'accès conditionnel."],
  ["Commande", "opération portant sur un ou plusieurs billets, options, dons ou services."],
  ["Check-in", "validation d'une présence ou d'un droit d'accès, notamment par QR code."],
  ["EventaaS", "services techniques multi-tenant de YowEvent accessibles par API."],
  ["Contenu", "texte, image, audio, vidéo, marque, donnée, question, réponse ou fichier transmis."],
];

const RESPONSIBILITIES: [string, string][] = [
  ["Yowyob/YowEvent", "Infrastructure, sécurité de la plateforme, disponibilité selon plan, support, paiements et reversements selon configuration."],
  ["Organisateur", "Légalité, exactitude, lieu, permis, sécurité, contenu, prix, remboursements, fiscalité, personnels et exécution de l'événement."],
  ["Participant/acheteur", "Exactitude des informations, paiement, protection du billet, conduite et respect des conditions."],
  ["Prestataire de paiement", "Autorisation, règlement, contrôles et disponibilité de son réseau selon ses conditions."],
  ["Intégrateur EventaaS", "Frontend, mappings, secrets, conformité, support, stockage, webhooks et opérations de son application."],
];

const SECTIONS: { title: string; body: string[] }[] = [
  { title: "1. Identité, objet et périmètre", body: [
    "Yowyob Inc. Ltd, société à responsabilité limitée de droit camerounais, au capital social de 1 000 000 FCFA, immatriculée au Registre du Commerce et du Crédit Mobilier sous le numéro RC/YAO/2020/B/1614, NIF M102015282478U, siège social : Carrefour Anguissa, Yaoundé, S/C Yaoundé 1er, Rue 1.121 Djoungolo, Cameroun, exploite YowEvent.",
    "YowEvent fournit une infrastructure de découverte, création, publication, promotion, inscription, billetterie, paiement, contrôle d'accès, animation, analyse et suivi des événements. EventaaS permet en outre à des organisations et intégrateurs de construire leurs propres interfaces au-dessus des services YowEvent.",
  ]},
  { title: "2. Acceptation, hiérarchie et preuve", body: [
    "L'accès ou l'utilisation du service, la création d'un compte, la publication d'un événement, l'achat ou l'émission d'un billet, le scan d'un QR code ou l'usage d'une API emporte acceptation des documents applicables. En cas de contradiction, l'ordre de priorité est : loi impérative, conditions particulières acceptées, page et règles de l'événement, plan ou devis, présentes CGU, documentation technique.",
    "Les journaux, horodatages, identifiants de commande, accusés, signatures API, QR codes, reçus, confirmations et traces d'audit peuvent constituer des éléments de preuve, sous réserve des droits de contestation et de la loi applicable.",
  ]},
  { title: "4. Catégories d'utilisateurs et rôles", body: [
    "Les rôles peuvent inclure visiteur, participant, acheteur, bénéficiaire du billet, organisateur, propriétaire d'espace, membre d'équipe, agent de contrôle, bénévole, intervenant, artiste, sponsor, exposant, fournisseur, prestataire, développeur, intégrateur et administrateur de plateforme. Une même personne peut cumuler plusieurs rôles.",
    "L'organisation désigne les administrateurs autorisés et reste responsable de leurs habilitations, délégations, appareils, clés API, opérations et retraits de droits.",
  ]},
  { title: "5. Éligibilité, comptes et sécurité", body: [
    "Les informations fournies doivent être exactes, complètes et tenues à jour. Les identifiants, codes OTP, liens de connexion, QR administratifs, clés API, appareils de contrôle et secrets ne doivent pas être partagés hors des personnes autorisées.",
    "Yowyob peut demander une vérification d'identité, de qualité, d'organisation, de compte de paiement ou de pouvoir de représentation, notamment avant publication, encaissement, reversement, augmentation de quota ou traitement d'un incident.",
  ]},
  { title: "6. Création, description et publication d'un événement", body: [
    "L'organisateur doit publier une description loyale : identité, thème, format, dates et fuseau horaire, lieu ou modalités en ligne, programme, capacité, accessibilité, âge requis, langues, intervenants confirmés ou pressentis, prix, taxes, frais, conditions de transfert, remboursement et contact.",
    "Les mentions « complet », « officiel », « certifié », « gratuit », « garanti », « VIP », « solidaire », « caritatif » ou équivalentes doivent être justifiables. Les simulations, événements fictifs ou données de démonstration doivent être clairement identifiés.",
  ]},
  { title: "7. Événements interdits, restreints ou à risque élevé", body: [
    "Sont interdits les événements illégaux, frauduleux, trompeurs, haineux, exploitant des personnes, facilitant la violence, le terrorisme, la traite, les drogues illicites, les armes ou explosifs non autorisés, la contrefaçon, les systèmes pyramidaux, les jeux d'argent illicites ou la collecte de fonds mensongère.",
    "Les événements politiques, électoraux, médicaux, financiers, religieux, destinés aux mineurs, impliquant alcool, sécurité privée, fortes affluences, activités physiques, transport, animaux, collecte de dons ou diffusion réglementée peuvent nécessiter une revue, des autorisations et conditions renforcées. YowEvent peut refuser ou suspendre sans valider la légalité de fond.",
  ]},
  { title: "8. Autorisations, lieu, sécurité et assurance", body: [
    "L'organisateur obtient les autorisations du lieu, licences, droits musicaux, permis de spectacle, sécurité incendie, protection civile, services médicaux, assurance responsabilité, autorisations municipales, fiscales, sanitaires et de sécurité applicables.",
    "Il fixe une capacité réaliste, un plan d'évacuation, des procédures d'urgence, des contrôles adaptés et un personnel formé. La salle d'attente virtuelle protège la plateforme lors des ventes; elle ne remplace pas la gestion physique des foules.",
  ]},
  { title: "9. Intervenants, artistes, prestataires, sponsors et bénévoles", body: [
    "L'organisateur garantit disposer des contrats, droits, visas, assurances, autorisations d'image, conditions de rémunération et règles de travail nécessaires. Il doit distinguer les partenaires confirmés des simples invitations ou négociations.",
    "Le sponsoring, les placements, stands, cadeaux, concours et contenus de marque doivent être identifiables et conformes aux règles de publicité, de consommation et de protection des publics vulnérables.",
  ]},
  { title: "10. Billets, invitations et inscriptions", body: [
    "Les billets peuvent être gratuits ou payants, nominatifs ou transférables, uniques ou multi-accès, associés à un tarif, une période de vente, une capacité, un siège, une session ou un avantage. Les restrictions doivent apparaître avant commande.",
    "Un billet constitue un droit d'accès conditionnel et non un droit absolu : identité, âge, tenue, sécurité, capacité, conditions sanitaires, horaires ou règles raisonnables du lieu peuvent être vérifiés, sans discrimination illicite.",
  ]},
  { title: "11. Prix, frais, taxes et devises", body: [
    "L'organisateur détermine le prix de base, les taxes et avantages; YowEvent affiche les frais de service, commissions ou frais de paiement applicables avant validation lorsque cela est requis. Les prix publiés doivent être complets et non trompeurs.",
    "Les conversions, arrondis, retenues, taxes, frais Mobile Money ou carte et coûts de change peuvent dépendre des prestataires. Les plans et quotas publiés peuvent évoluer; le prix accepté pour une période demeure applicable selon les conditions du plan.",
  ]},
  { title: "12. Commandes et paiements", body: [
    "Une commande n'est définitive qu'après confirmation technique et, pour un billet payant, confirmation du paiement ou statut prévu. L'utilisateur vérifie l'événement, la date, le nombre, le bénéficiaire, le moyen de paiement et le montant avant validation.",
    "Les paiements peuvent être traités par Mobile Money, carte ou autres prestataires activés. Yowyob ne demande jamais le code secret Mobile Money, le PIN complet ni le mot de passe bancaire. Les règles du prestataire de paiement s'appliquent en complément.",
  ]},
  { title: "13. Reversements, réserves, commissions et chargebacks", body: [
    "Les recettes peuvent être créditées au solde de l'organisateur, déduction faite des commissions, remboursements, impôts, frais, réserves et contestations. Un reversement peut être retardé pour vérification, risque de fraude, annulation, obligation légale ou incohérence bancaire.",
    "L'organisateur demeure économiquement responsable des remboursements, chargebacks, événements annulés, prestations non fournies, taxes et obligations envers participants, artistes et prestataires, sauf engagement exprès différent.",
  ]},
  { title: "14. Annulation, report, modification et substitution", body: [
    "L'organisateur doit notifier sans délai toute annulation, report, changement substantiel de lieu, date, programme, tête d'affiche, format ou capacité. La page de l'événement doit être mise à jour et les participants informés par les canaux disponibles.",
    "Les conditions indiquent si le billet reste valable, peut être transféré, remboursé ou converti. Une modification mineure ne donne pas automatiquement droit au remboursement; une modification substantielle est appréciée selon la loi, l'offre et les attentes légitimes.",
  ]},
  { title: "15. Remboursements et réclamations", body: [
    "La politique de remboursement doit être publiée avant achat. Elle ne peut supprimer les droits impératifs du consommateur. Lorsque YowEvent exécute techniquement un remboursement, cela ne transfère pas automatiquement la dette économique de l'organisateur à Yowyob.",
    "Toute demande doit identifier la commande, l'événement, le motif et le résultat recherché. Des délais bancaires ou Mobile Money peuvent s'ajouter après instruction.",
  ]},
  { title: "16. QR codes, contrôle d'accès et lutte contre la fraude", body: [
    "Chaque billet ou invitation peut comporter un identifiant ou QR code unique. Il est interdit de le reproduire, vendre deux fois, falsifier, deviner, scanner sans autorisation ou contourner les contrôles.",
    "Le premier scan valide peut neutraliser les copies. Un refus automatique doit pouvoir être vérifié manuellement lorsque les circonstances le permettent. Les agents de contrôle protègent leurs appareils et ne conservent pas inutilement les listes ou pièces d'identité.",
  ]},
  { title: "17. Mode hors ligne, synchronisation et réconciliation", body: [
    "La PWA ou l'application peut conserver localement billets, listes, scans, opérations et files de synchronisation. En cas de reconnexion, des doublons, conflits, retards ou ordres différents peuvent survenir. Les règles de réconciliation privilégient l'unicité du billet, l'horodatage, l'appareil autorisé et la revue humaine des conflits.",
    "L'organisateur doit synchroniser les appareils avant l'ouverture, limiter les exports, protéger les terminaux et prévoir une procédure manuelle de continuité. Yowyob ne garantit pas qu'une donnée locale non synchronisée soit récupérable après perte, réinitialisation ou désinstallation.",
  ]},
  { title: "18. Capacité, affluence et urgence", body: [
    "Les indicateurs d'inscription et de check-in aident l'organisateur mais ne remplacent pas le comptage réglementaire, la sécurité du lieu ni l'autorité compétente. L'organisateur peut refuser l'accès ou évacuer pour sécurité, fraude, comportement dangereux ou capacité légale.",
    "YowEvent n'est pas un service d'urgence. En cas de danger, les utilisateurs doivent contacter les services locaux compétents et suivre les consignes du lieu.",
  ]},
  { title: "19. Événements en ligne et contenus diffusés", body: [
    "Pour un événement en ligne ou hybride, l'organisateur gère les droits de diffusion, la modération, les accès, l'enregistrement, le fuseau horaire, les prérequis techniques et les solutions de secours. La qualité dépend aussi du réseau, des appareils et des fournisseurs tiers.",
    "Les liens de réunion et codes d'accès sont confidentiels. L'enregistrement, la capture ou la redistribution peuvent être interdits selon les droits annoncés.",
  ]},
  { title: "20. Contenus, propriété intellectuelle et droits à l'image", body: [
    "Chaque contributeur conserve ses droits sur ses contenus et accorde à Yowyob une licence non exclusive, mondiale, limitée à l'hébergement, reproduction technique, adaptation de format, traduction, affichage, promotion de l'événement et fourniture du service.",
    "L'organisateur obtient les droits sur logos, photos, musiques, vidéos, marques, plans, présentations et portraits. Le retrait d'un contenu public n'efface pas automatiquement les copies légales, preuves, sauvegardes ou publications déjà partagées.",
  ]},
  { title: "21. Photographies, enregistrements et captation", body: [
    "La page de l'événement doit informer lorsque des photos, vidéos, captations audio, livestreams ou dispositifs de surveillance sont prévus, indiquer les finalités et offrir les mécanismes d'opposition raisonnables requis.",
    "Une autorisation renforcée peut être nécessaire pour les mineurs, les portraits individualisés, les usages publicitaires, biométriques ou sensibles. Le simple achat d'un billet ne vaut pas toujours consentement à toute exploitation commerciale de l'image.",
  ]},
  { title: "22. Conduite des participants et communauté", body: [
    "Les participants respectent la loi, le lieu, les autres personnes, les consignes, la propriété intellectuelle et le code de conduite publié. Harcèlement, menace, fraude, discrimination, perturbation, collecte non autorisée ou atteinte à la sécurité peuvent entraîner exclusion sans préjudice des droits légaux.",
    "Les questions, sondages, commentaires et retours ne doivent pas contenir de secrets, données bancaires, informations médicales nominatives ou données de tiers sans base valable.",
  ]},
  { title: "23. Mineurs et publics vulnérables", body: [
    "L'organisateur précise l'âge minimum, l'accompagnement requis et les règles de consentement parental. Les événements destinés aux mineurs doivent appliquer des contrôles renforcés de personnel, contenus, communications, images, localisation et données.",
    "Les mécanismes de ciblage, profilage, vente additionnelle ou publicité ne doivent pas exploiter l'inexpérience, la vulnérabilité ou la détresse.",
  ]},
  { title: "24. Accessibilité et non-discrimination", body: [
    "L'organisateur fournit des informations fiables sur l'accessibilité physique, linguistique et numérique et traite les demandes d'aménagement raisonnable. YowEvent s'efforce de proposer des interfaces compatibles avec les technologies d'assistance, sous réserve des contenus et intégrations de tiers.",
    "Les conditions d'accès et de prix ne doivent pas produire de discrimination illicite. Les tarifs ciblés doivent reposer sur un critère licite et vérifiable.",
  ]},
  { title: "25. Campagnes, invitations et communications", body: [
    "L'organisateur ne peut importer ou contacter que des personnes pour lesquelles il dispose d'une base juridique, d'une information appropriée et d'un mécanisme d'opposition. Les listes achetées, extraites illicitement ou destinées à du spam sont interdites.",
    "Les messages transactionnels nécessaires au billet, à la sécurité ou à une modification de l'événement sont distincts des messages promotionnels. Un désabonnement marketing n'empêche pas les communications indispensables à une commande en cours.",
  ]},
  { title: "26. Analytics, recommandations et décisions automatisées", body: [
    "Les tableaux de bord peuvent présenter inscriptions, ventes, recettes, taux de remplissage, arrivées, trafic, interactions et retours. Ils constituent des estimations dépendantes de la qualité des données, de la synchronisation et des sources.",
    "Aucune accusation de fraude, exclusion définitive, refus de reversement ou décision significative ne devrait reposer exclusivement sur un score opaque non vérifié. Une revue humaine et une voie de contestation sont prévues lorsque la loi ou le contexte l'exige.",
  ]},
  { title: "27. Visibilité, sponsoring et publicité", body: [
    "YowEvent peut classer, recommander ou mettre en avant des événements selon leur pertinence, localisation, fraîcheur, qualité, popularité, sécurité, disponibilité ou relation commerciale. Un placement sponsorisé doit être identifiable.",
    "La visibilité n'est pas une certification de qualité, de sécurité, de légalité ou de solvabilité. Les organisateurs sont responsables de la véracité de leurs promotions, concours et avantages.",
  ]},
  { title: "28. EventaaS, API, SDK et webhooks", body: [
    "Deux modes d'authentification coexistent et ne sont pas soumis aux mêmes règles : le jeton JWT d'une session tableau de bord (usage interne, propre organisation) n'est pas soumis au quota d'appels mensuel, mais reste soumis aux fonctionnalités autorisées par le plan d'hébergement souscrit ; la clé API (EventaaS, trafic externe/programmatique) est isolée par tenant, comptabilisée et plafonnée selon le plan API souscrit. Les secrets ne doivent jamais être exposés dans un client public ou dépôt de code.",
    "Les opérations de création (commandes, billets) prennent en charge un en-tête Idempotency-Key : une requête identique rejouée avec la même clé renvoie la ressource déjà créée au lieu d'en créer une seconde. Hors de ce périmètre documenté, l'intégrateur ne doit pas présumer d'une garantie d'idempotence.",
    "L'intégrateur est responsable de son interface, de ses mentions, de ses utilisateurs, mappings, retries, stockage, sécurité, support et conformité. Il ne doit pas présenter son service comme officiellement approuvé sans autorisation écrite.",
  ]},
  { title: "29. Abonnements, quotas, disponibilité et bêta", body: [
    "Le plan d'hébergement YowEvent (événements, membres d'équipe, participants, domaines, campagnes, analytics, support) et le plan API EventaaS (quota d'appels mensuel) sont deux abonnements distincts et indépendants, facturés séparément : la souscription à un plan d'hébergement, même illimité, n'inclut aucun accès API et ne donne droit à aucune clé API tant qu'un plan API n'a pas été souscrit séparément.",
    "Un dépassement du quota d'appels API est bloqué (réponse 429) jusqu'à changement de plan ou début du mois suivant ; le volume d'appels au-delà du plafond est mesuré et pourra faire l'objet d'une facturation au dépassement dans une version ultérieure, selon les informations affichées au moment de l'opération.",
    "Les fonctions bêta peuvent changer, être indisponibles ou produire des erreurs. Les SLA ne s'appliquent que s'ils figurent dans un accord ou plan spécifique. Les maintenances, incidents de réseau, opérateurs de paiement et cas de force majeure peuvent affecter le service.",
  ]},
  { title: "30. Données hors du Cloud Yowyob", body: [
    "L'organisateur ou intégrateur qui exporte listes, billets, pièces, rapports, contacts, logs, médias ou données vers un appareil, tableur, email, CRM, cloud, imprimante, kiosque, sauvegarde, API ou prestataire externe devient responsable de cet environnement.",
    "La suppression dans YowEvent ne supprime pas les copies externes. L'exportateur doit sécuriser, limiter, documenter, conserver et supprimer les copies, propager les droits et notifier les incidents conformément à la loi.",
  ]},
  { title: "31. Modération, suspension et retrait", body: [
    "Yowyob peut demander des preuves, réduire la visibilité, suspendre les ventes, geler un reversement, invalider des billets, désactiver une clé, retirer un contenu ou fermer un compte en cas de risque crédible, fraude, violation, ordre d'autorité ou sécurité.",
    "Lorsque raisonnablement possible, l'utilisateur est informé et peut contester. Des mesures immédiates peuvent être prises sans préavis pour protéger les personnes, fonds, systèmes, preuves ou obligations légales.",
  ]},
  { title: "32. Responsabilités et limites", body: [
    "Yowyob fournit une infrastructure et n'est pas automatiquement l'organisateur, le propriétaire du lieu, l'employeur, l'artiste, le transporteur, l'assureur, le service de sécurité, le conseiller juridique ou l'autorité publique.",
    "Dans les limites de la loi, Yowyob n'est pas responsable des actes de l'organisateur ou des tiers, de la qualité de l'événement, d'un réseau indisponible, d'une décision du lieu, d'une annulation, d'un accident ou d'une perte indirecte non imputable à une faute de Yowyob. Aucune clause n'exclut une responsabilité qui ne peut légalement l'être.",
  ]},
  { title: "33. Garantie et indemnisation", body: [
    "L'organisateur garantit disposer des pouvoirs, droits, autorisations et ressources nécessaires. Il coopère concernant fraude, remboursement, incident, droit d'auteur, sécurité, contrôle fiscal ou demande d'autorité.",
    "Sous réserve de la loi, il indemnise Yowyob des conséquences d'une violation imputable à son événement, ses contenus, ses données, ses offres, ses prestataires ou son absence d'autorisation.",
  ]},
  { title: "34. Résiliation, fin d'événement et réversibilité", body: [
    "La fermeture d'un compte n'efface pas les obligations relatives aux billets, remboursements, taxes, litiges, preuves, paiements ou droits de tiers. Les données peuvent être exportées pendant la période prévue par le plan ou la loi.",
    "Yowyob peut conserver certaines données au titre des obligations légales, de la preuve, de la sécurité, des sauvegardes et de la prévention de la fraude, puis les supprimer ou anonymiser selon sa politique.",
  ]},
  { title: "35. Droit applicable, réclamations et versions linguistiques", body: [
    "Les relations principalement rattachées au Cameroun sont régies par le droit camerounais, sans priver le consommateur des protections impératives applicables. Les parties recherchent d'abord une résolution amiable et peuvent utiliser les recours compétents.",
    "Contacts : support@yowyob.com et legal@yowyob.com. La version française prévaut pour les opérations principalement rattachées au Cameroun, sauf règle impérative ou accord écrit différent.",
  ]},
  { title: "36. Modification des Conditions", body: [
    "Yowyob peut modifier les Conditions pour faire évoluer le service, la sécurité, la loi, les fournisseurs ou le modèle économique. Les changements substantiels sont portés à la connaissance des utilisateurs par un moyen approprié. La poursuite de l'usage après entrée en vigueur vaut acceptation lorsque la loi le permet.",
  ]},
];

const UI: Record<Lang, Record<string, string>> = {
  fr: {
    back: "Retour",
    title: "Conditions générales d'utilisation et de services",
    subtitle: "Création, publication, billetterie, gestion et suivi des événements",
    important: "IMPORTANT — Ces Conditions régissent une version bêta publiée. Elles doivent être lues avec la page de l'événement, les conditions de billet, le plan souscrit, les conditions de paiement, les instructions du lieu, les règles de l'organisateur et les notices affichées au moment de l'opération.",
    docControl: "Contrôle du document",
    scope: "Périmètre du système",
    scopeBody: "Le périmètre inclut les interfaces publiques de découverte, les espaces organisateur et équipe, la billetterie, le contrôle d'accès, les événements en ligne ou présentiels, les applications Web/PWA/mobiles, les fonctions hors ligne, les kiosques, les tableaux de bord, les sous-domaines et domaines personnalisés, les API, SDK, webhooks, intégrations de paiement, notifications et services EventaaS.",
    legalRefs: "Références juridiques indicatives",
    legalQualif: "Ces références ne sont pas exhaustives. L'organisateur doit identifier les autorisations, licences, assurances, règles de sécurité, fiscalité, protection des mineurs, droits musicaux, obligations de billetterie et règles sectorielles applicables dans chaque pays et lieu.",
    definitions: "Définitions essentielles",
    responsibilities: "Acteurs et responsabilités",
    partTitle: "Conditions générales — Français",
    effectiveDate: "Date d'entrée en vigueur : 30 juillet 2026",
    enNotice: "Full English clause text (Sections 1–36) is being finalised. Per Section 35 of this document, the French version prevails for operations primarily connected to Cameroon. The bilingual front-matter below is provided in English; switch to French for the full contractual body.",
  },
  en: {
    back: "Back",
    title: "Terms of Use and Services",
    subtitle: "Creation, publication, ticketing, management and monitoring of events",
    important: "IMPORTANT — These Terms govern a published beta. They must be read with the event page, ticket conditions, subscribed plan, payment terms, venue instructions, organiser rules and notices displayed at the time of the transaction.",
    docControl: "Document control",
    scope: "System scope",
    scopeBody: "Scope includes public discovery, organiser and team workspaces, ticketing, access control, online or in-person events, Web/PWA/mobile applications, offline features, kiosks, dashboards, subdomains and custom domains, APIs, SDKs, webhooks, payment integrations, notifications and EventaaS services.",
    legalRefs: "Indicative legal references",
    legalQualif: "These references are not exhaustive. The organiser must identify the permits, licences, insurance, safety rules, taxation, child protection, music rights, ticketing obligations and sector-specific requirements applicable in each country and venue.",
    definitions: "Key definitions",
    responsibilities: "Actors and responsibilities",
    partTitle: "Terms of Use — English",
    effectiveDate: "Effective date: 30 July 2026",
    enNotice: "Full English clause text (Sections 1–36) is being finalised. Per Section 35 of this document, the French version prevails for operations primarily connected to Cameroon. The bilingual front-matter below is provided in English; switch to French for the full contractual body.",
  },
};

export default function TermsPage() {
  const [lang, setLang] = useState<Lang>("fr");
  const i = (pair: [string, string]) => (lang === "fr" ? pair[0] : pair[1]);
  const u = UI[lang];

  return (
    <div className="min-h-screen bg-white text-[#1a1a1a]">
      <nav className="border-b border-[#f0f0f0] px-8 py-4 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur z-50">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#666] hover:text-[#1a1a1a] transition-colors">
          <ArrowLeft size={14} /> {u.back}
        </Link>
        <div className="flex bg-[#f5f5f5] rounded-full p-1 border border-[#e5e7eb]">
          <button
            onClick={() => setLang("fr")}
            className={`px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${lang === "fr" ? "bg-[#FF4747] text-white" : "text-[#666]"}`}
          >
            FR
          </button>
          <button
            onClick={() => setLang("en")}
            className={`px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${lang === "en" ? "bg-[#FF4747] text-white" : "text-[#666]"}`}
          >
            EN
          </button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <p className="text-xs font-bold uppercase tracking-widest text-[#FF4747] mb-2">YowEvent · A Yowyob System</p>
        <h1 className="font-display text-3xl font-black tracking-tight mb-2">{u.title}</h1>
        <p className="text-sm text-[#888] mb-8">{u.subtitle}</p>

        <div className="bg-[#FF4747]/5 border border-[#FF4747]/20 rounded-2xl p-5 text-xs leading-relaxed text-[#555] mb-10">
          {u.important}
        </div>

        {/* Document control */}
        <h2 className="font-display text-lg font-bold mb-3">{u.docControl}</h2>
        <div className="overflow-x-auto mb-10">
          <table className="w-full text-xs border-collapse">
            <tbody>
              {CONTROL_ROWS.map((row) => (
                <tr key={row.field[0]} className="border-b border-[#f0f0f0]">
                  <td className="py-2 pr-4 font-semibold text-[#888] whitespace-nowrap align-top">{i(row.field)}</td>
                  <td className="py-2 text-[#1a1a1a]">{i(row.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Scope */}
        <h2 className="font-display text-lg font-bold mb-3">{u.scope}</h2>
        <p className="text-xs leading-relaxed text-[#555] mb-10">{u.scopeBody}</p>

        {/* Legal references */}
        <h2 className="font-display text-lg font-bold mb-3">{u.legalRefs}</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-xs leading-relaxed text-[#555] mb-3">
          {LEGAL_REFS.map((ref) => (
            <li key={ref[0]}>{i(ref)}</li>
          ))}
        </ul>
        <p className="text-xs italic text-[#888] mb-10">{u.legalQualif}</p>

        {/* Definitions */}
        <h2 className="font-display text-lg font-bold mb-3">{u.definitions}</h2>
        <div className="overflow-x-auto mb-10">
          <table className="w-full text-xs border-collapse">
            <tbody>
              {DEFINITIONS.map(([term, def]) => (
                <tr key={term} className="border-b border-[#f0f0f0]">
                  <td className="py-2 pr-4 font-semibold text-[#1a1a1a] whitespace-nowrap align-top">{term}</td>
                  <td className="py-2 text-[#555]">{def}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Responsibilities */}
        <h2 className="font-display text-lg font-bold mb-3">{u.responsibilities}</h2>
        <div className="overflow-x-auto mb-10">
          <table className="w-full text-xs border-collapse">
            <tbody>
              {RESPONSIBILITIES.map(([actor, resp]) => (
                <tr key={actor} className="border-b border-[#f0f0f0]">
                  <td className="py-2 pr-4 font-semibold text-[#1a1a1a] whitespace-nowrap align-top">{actor}</td>
                  <td className="py-2 text-[#555]">{resp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <hr className="border-[#f0f0f0] mb-10" />

        {lang === "en" && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-xs leading-relaxed text-amber-800 mb-10">
            {u.enNotice}
          </div>
        )}

        <h2 className="font-display text-2xl font-black mb-1">{u.partTitle}</h2>
        <p className="text-xs text-[#888] mb-8">{u.effectiveDate}</p>

        {lang === "fr" ? (
          <div className="space-y-8">
            <p className="text-xs leading-relaxed text-[#555]">
              Les présentes CGU constituent le socle contractuel commun de YowEvent. Les conditions particulières d'un événement,
              d'un billet, d'un abonnement, d'une API, d'un domaine personnalisé, d'un service de paiement ou d'un accord entreprise
              prévalent pour leur objet spécifique.
            </p>
            {SECTIONS.map((s) => (
              <section key={s.title}>
                <h3 className="font-display text-base font-bold mb-2">{s.title}</h3>
                {s.body.map((p, idx) => (
                  <p key={idx} className="text-xs leading-relaxed text-[#555] mb-2">{p}</p>
                ))}
              </section>
            ))}
          </div>
        ) : (
          <p className="text-xs leading-relaxed text-[#555]">
            {u.enNotice}
          </p>
        )}
      </main>
    </div>
  );
}
