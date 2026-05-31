const Component = () => {
  // CORRIGÉ : Fonction pour déterminer l'année scolaire courante basée sur le 1er septembre
  const getCurrentSchoolYear = () => {
    const today = new Date();
    const currentCalendarYear = today.getFullYear();
    const september1st = new Date(currentCalendarYear, 8, 1); // 1er septembre de l'année civile actuelle
    
    // Si on est avant le 1er septembre, on est encore dans l'année scolaire précédente
    if (today < september1st) {
      return currentCalendarYear - 1;
    } else {
      return currentCalendarYear;
    }
  };

  const [currentYear, setCurrentYear] = useState(getCurrentSchoolYear()); // MODIFIÉ : Utilise la fonction
  const [personnels, setPersonnels] = useState([]);
  const [allPersonnels, setAllPersonnels] = useState([]); // Tous les personnels
  const [services, setServices] = useState([]); // Liste des services
  const [groupes, setGroupes] = useState([]); // Liste des groupes
  const [filterMode, setFilterMode] = useState('services'); // 'services' ou 'groupes'
  const [selectedService, setSelectedService] = useState(null); // Service sélectionné
  const [selectedGroupe, setSelectedGroupe] = useState(null); // Groupe sélectionné
  const [userInfo, setUserInfo] = useState(null); // Informations utilisateur connecté
  const [userPersonnelId, setUserPersonnelId] = useState(null); // ID du personnel correspondant à l'utilisateur
  const [isRestrictedUser, setIsRestrictedUser] = useState(false); // Restriction utilisateur
  const [isResponsable, setIsResponsable] = useState(false); // Utilisateur responsable
  const [userServiceId, setUserServiceId] = useState(null); // Service de l'utilisateur
  const [conges, setConges] = useState([]);
  const [typeConges, setTypeConges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTypeConge, setSelectedTypeConge] = useState(1); // Par défaut: Congé annuel
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Trigger pour forcer le rechargement
  
  // État pour stocker les cases cochées avec types : {personId: {monthIndex: {day: {morning: {checked: boolean, typeId: number}, afternoon: {checked: boolean, typeId: number}}}}}
  const [checkedCells, setCheckedCells] = useState({});
  // État pour stocker l'état initial (pour détecter les changements)
  const [initialCheckedCells, setInitialCheckedCells] = useState({});
  
  // État simple pour forcer la mise à jour du bouton
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Flag pour savoir si l'initialisation est terminée
  const [isInitialized, setIsInitialized] = useState(false);
  
  // État pour la sélection multiple
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionState, setSelectionState] = useState(null); // true = cocher, false = décocher
  const [currentSelectionPerson, setCurrentSelectionPerson] = useState(null);
  const [currentSelectionMonth, setCurrentSelectionMonth] = useState(null);

  // Noms des mois en français (année scolaire : septembre à août)
  const monthNames = [
    'Septembre', 'Octobre', 'Novembre', 'Décembre',
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août'
  ];

  // Correspondance entre l'index de l'année scolaire et le mois réel
  const getActualMonth = (schoolYearIndex) => {
    if (schoolYearIndex < 4) {
      return schoolYearIndex + 8;
    } else {
      return schoolYearIndex - 4;
    }
  };

  // Obtenir l'année réelle pour un mois donné
  const getActualYear = (schoolYearIndex, baseYear) => {
    if (schoolYearIndex < 4) {
      return baseYear;
    } else {
      return baseYear + 1;
    }
  };

  // Noms des jours de la semaine (forme réduite)
  const dayNamesShort = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'];

  // Fonction pour obtenir l'index du mois dans l'année scolaire
  const getSchoolYearMonthIndex = (date) => {
    const month = date.getMonth();
    const year = date.getFullYear();
    
    // Vérifier si la date est dans l'année scolaire courante
    if (month >= 8) { // Septembre à Décembre
      if (year === currentYear) {
        return month - 8;
      }
    } else { // Janvier à Août
      if (year === currentYear + 1) {
        return month + 4;
      }
    }
    
    return -1; // Pas dans l'année scolaire courante
  };

  // Fonction pour convertir les dates Grist (timestamp Unix) en Date JavaScript
  const parseGristDate = (gristDate) => {
    let date;
    
    // Si c'est un timestamp Unix (nombre de secondes)
    if (typeof gristDate === 'number') {
      date = new Date(gristDate * 1000);
    } else if (typeof gristDate === 'string') {
      date = new Date(gristDate);
    } else {
      date = new Date(gristDate);
    }
    
    // CORRECTION DU DÉCALAGE : Créer une nouvelle date en utilisant les composantes locales
    const correctedDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      12, 0, 0, 0
    );
    
    return correctedDate;
  };

  // Fonction pour formater une date pour Grist (format ISO date seule)
  const formatDateForGrist = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Fonction pour obtenir les informations d'un type de congé
  const getTypeCongeInfo = (typeId) => {
    const type = typeConges.find(t => t.id === typeId);
    return type ? {
      code: type.Code,
      couleur: `#${type.Couleur}`,
      libelle: type.Libelle
    } : {
      code: 'C',
      couleur: '#27F527',
      libelle: 'Inconnu'
    };
  };

  // Fonction pour créer une clé unique pour un congé (incluant le type)
  const createCongeKey = (personId, monthIndex, day, period, typeId) => {
    return `${personId}-${monthIndex}-${day}-${period}-${typeId}`;
  };

  // Fonction pour comparer deux états de cases cochées
  const getChanges = () => {
    const changes = {
      toAdd: [], // Nouveaux congés à ajouter
      toRemove: [] // Congés à supprimer (avec IDs)
    };

    // Créer des maps pour comparaison
    const initialKeys = new Set();
    const currentKeys = new Set();
    const congeIdMap = new Map(); // Map key -> conge.id pour suppression

    // Construire la map des congés initiaux
    for (const [personId, months] of Object.entries(initialCheckedCells)) {
      for (const [monthIndex, days] of Object.entries(months)) {
        for (const [day, periods] of Object.entries(days)) {
          if (periods.morning && periods.morning.checked) {
            const key = createCongeKey(personId, monthIndex, day, 'morning', periods.morning.typeId);
            initialKeys.add(key);
          }
          if (periods.afternoon && periods.afternoon.checked) {
            const key = createCongeKey(personId, monthIndex, day, 'afternoon', periods.afternoon.typeId);
            initialKeys.add(key);
          }
        }
      }
    }

    // Construire la map des congés actuels
    for (const [personId, months] of Object.entries(checkedCells)) {
      for (const [monthIndex, days] of Object.entries(months)) {
        for (const [day, periods] of Object.entries(days)) {
          if (periods.morning && periods.morning.checked) {
            const key = createCongeKey(personId, monthIndex, day, 'morning', periods.morning.typeId);
            currentKeys.add(key);
          }
          if (periods.afternoon && periods.afternoon.checked) {
            const key = createCongeKey(personId, monthIndex, day, 'afternoon', periods.afternoon.typeId);
            currentKeys.add(key);
          }
        }
      }
    }

    // Créer la map des IDs de congés existants
    conges.forEach(conge => {
      const date = parseGristDate(conge.Date);
      const monthIndex = getSchoolYearMonthIndex(date);
      const day = date.getDate();
      const period = conge.Creneau === 'Matinée' ? 'morning' : 'afternoon';
      
      if (monthIndex !== -1) {
        const key = createCongeKey(conge.Personnel, monthIndex, day, period, conge.Type_Conge);
        congeIdMap.set(key, conge.id);
      }
    });

    // Identifier les ajouts (dans current mais pas dans initial)
    for (const key of currentKeys) {
      if (!initialKeys.has(key)) {
        const [personId, monthIndex, day, period, typeId] = key.split('-');
        const monthIdx = parseInt(monthIndex);
        const dayNum = parseInt(day);
        
        const actualMonth = getActualMonth(monthIdx);
        const actualYear = getActualYear(monthIdx, currentYear);
        const date = new Date(actualYear, actualMonth, dayNum);
        
        changes.toAdd.push({
          Personnel: parseInt(personId),
          Date: formatDateForGrist(date),
          Creneau: period === 'morning' ? 'Matinée' : 'Après-midi',
          Type_Conge: parseInt(typeId)
        });
      }
    }

    // Identifier les suppressions (dans initial mais pas dans current)
    for (const key of initialKeys) {
      if (!currentKeys.has(key)) {
        const congeId = congeIdMap.get(key);
        if (congeId) {
          changes.toRemove.push(congeId);
        }
      }
    }

    return changes;
  };

  // Fonction pour filtrer les personnels par service
  const filterPersonnelsByService = (serviceId) => {
    if (!serviceId) {
      return allPersonnels;
    }
    return allPersonnels.filter(p => p.serviceId === serviceId);
  };

  // Fonction pour filtrer les personnels par groupe
  const filterPersonnelsByGroupe = (groupeId) => {
    if (!groupeId) {
      return allPersonnels;
    }
    return allPersonnels.filter(p => {
      // La colonne Groupes contient un tableau JSON d'IDs
      if (p.groupes && Array.isArray(p.groupes)) {
        return p.groupes.includes(groupeId);
      }
      return false;
    });
  };

  // Fonction pour filtrer selon le mode actuel
  const filterPersonnels = () => {
    if (filterMode === 'services') {
      return filterPersonnelsByService(selectedService);
    } else {
      return filterPersonnelsByGroupe(selectedGroupe);
    }
  };

  // Fonction pour vérifier si un personnel peut être modifié
  const canModifyPersonnel = (personnelId) => {
    // Si l'utilisateur n'est pas restreint, il peut modifier tout le monde
    if (!isRestrictedUser) {
      return true;
    }
    
    // Si l'utilisateur est restreint :
    // 1. Il peut toujours modifier ses propres congés
    if (personnelId === userPersonnelId) {
      return true;
    }
    
    // 2. S'il est responsable, il peut modifier les congés des personnels de son service
    if (isResponsable && userServiceId) {
      const targetPersonnel = allPersonnels.find(p => p.id === personnelId);
      if (targetPersonnel && targetPersonnel.serviceId === userServiceId) {
        return true;
      }
    }
    
    // Sinon, pas d'autorisation
    return false;
  };

  // Fonction pour initialiser les informations utilisateur
  const initializeUserInfo = async (allPersonnelsData) => {
    try {
      // Récupérer le premier utilisateur
      const utilisateursData = await gristAPI.getData('Utilisateurs');
      
      if (utilisateursData.length > 0) {
        const firstUser = utilisateursData[0];
        setUserInfo(firstUser);
        
        const userEmail = firstUser.Email;
        
        if (userEmail) {
          // Chercher le personnel correspondant à cet email
          const matchingPersonnel = allPersonnelsData.find(p => p.email === userEmail);
          
          if (matchingPersonnel) {
            setUserPersonnelId(matchingPersonnel.id);
            setIsRestrictedUser(true);
            
            // Vérifier si l'utilisateur est responsable
            const isUserResponsable = matchingPersonnel.responsable === true || matchingPersonnel.responsable === 'true';
            setIsResponsable(isUserResponsable);
            
            // Stocker le service de l'utilisateur
            setUserServiceId(matchingPersonnel.serviceId);
            
            console.log('Mode personnel activé pour:', {
              personnelId: matchingPersonnel.id,
              email: userEmail,
              responsable: isUserResponsable,
              serviceId: matchingPersonnel.serviceId
            });
            
            // Retourner les infos du personnel pour initialiser les filtres
            return {
              userService: firstUser.Service,
              userGroupes: matchingPersonnel.groupes,
              matchingPersonnel
            };
          } else {
            setIsRestrictedUser(false);
            setIsResponsable(false);
            setUserServiceId(null);
          }
        } else {
          setIsRestrictedUser(false);
          setIsResponsable(false);
          setUserServiceId(null);
        }
        
        return {
          userService: firstUser.Service,
          userGroupes: null,
          matchingPersonnel: null
        };
      } else {
        setIsRestrictedUser(false);
        setIsResponsable(false);
        setUserServiceId(null);
        return {
          userService: null,
          userGroupes: null,
          matchingPersonnel: null
        };
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation des infos utilisateur:', error);
      setIsRestrictedUser(false);
      setIsResponsable(false);
      setUserServiceId(null);
      return {
        userService: null,
        userGroupes: null,
        matchingPersonnel: null
      };
    }
  };

  // Fonction pour initialiser le service par défaut
  const initializeDefaultService = async (servicesData, userService) => {
    try {
      if (userService) {
        // Vérifier si ce service existe dans la liste des services
        const matchingService = servicesData.find(s => s.libelle === userService);
        
        if (matchingService) {
          return matchingService.id;
        } else {
          return servicesData.length > 0 ? servicesData[0].id : null;
        }
      } else {
        return servicesData.length > 0 ? servicesData[0].id : null;
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du service par défaut:', error);
      return servicesData.length > 0 ? servicesData[0].id : null;
    }
  };

  // Fonction pour initialiser le groupe par défaut
  const initializeDefaultGroupe = (groupesData, userGroupes) => {
    try {
      if (userGroupes && Array.isArray(userGroupes) && userGroupes.length > 0) {
        // Prendre le premier groupe de l'utilisateur
        const firstUserGroupeId = userGroupes[0];
        
        // Vérifier si ce groupe existe dans la liste des groupes
        const matchingGroupe = groupesData.find(g => g.id === firstUserGroupeId);
        
        if (matchingGroupe) {
          return matchingGroupe.id;
        } else {
          return groupesData.length > 0 ? groupesData[0].id : null;
        }
      } else {
        return groupesData.length > 0 ? groupesData[0].id : null;
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du groupe par défaut:', error);
      return groupesData.length > 0 ? groupesData[0].id : null;
    }
  };

  // Chargement des données depuis Grist
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setIsInitialized(false);
        
        // Charger les services
        const servicesData = await gristAPI.getData('Services');
        
        const servicesList = servicesData.map(s => ({
          id: s.id,
          libelle: s.Libelle
        }));
        setServices(servicesList);
        
        // Charger les groupes
        const groupesData = await gristAPI.getData('Groupes');
        
        const groupesList = groupesData.map(g => ({
          id: g.id,
          nom: g.Nom
        }));
        setGroupes(groupesList);
        
        // Charger TOUS les personnels avec la colonne Responsable
        const personnelsData = await gristAPI.getData('Personnels');
        
        const allPersonnelsList = personnelsData.map(p => ({
          id: p.id,
          name: p.PrenomNom || `${p.Prenom} ${p.Nom}`,
          nom: p.Nom,
          prenom: p.Prenom,
          email: p.Email,
          serviceId: p.Service,
          groupes: typeof p.Groupes === 'string' ? JSON.parse(p.Groupes) : (Array.isArray(p.Groupes) ? p.Groupes : []),
          responsable: p.Responsable
        }));
        setAllPersonnels(allPersonnelsList);
        
        // Initialiser les informations utilisateur ET récupérer les infos de filtrage
        const userInfos = await initializeUserInfo(allPersonnelsList);
        
        // Initialiser les filtres par défaut
        const defaultServiceId = await initializeDefaultService(servicesList, userInfos.userService);
        setSelectedService(defaultServiceId);
        
        // Initialiser le groupe par défaut
        const defaultGroupeId = initializeDefaultGroupe(groupesList, userInfos.userGroupes);
        setSelectedGroupe(defaultGroupeId);
        
        // Filtrer les personnels selon le mode par défaut (services)
        const filteredPersonnels = filterPersonnelsByService(defaultServiceId);
        setPersonnels(filteredPersonnels);
        
        // Charger les types de congés
        const typesData = await gristAPI.getData('Type_Conges');
        setTypeConges(typesData);
        
        // Charger les congés existants
        const congesData = await gristAPI.getData('Conges');
        setConges(congesData);
        
        // Initialiser les cases cochées avec les congés existants
        const newCheckedCells = {};
        
        congesData.forEach((conge, index) => {
          try {
            const date = parseGristDate(conge.Date);
            const personnelId = conge.Personnel;
            const creneau = conge.Creneau;
            const typeCongeId = conge.Type_Conge;
            
            const monthIndex = getSchoolYearMonthIndex(date);
            const day = date.getDate();
            
            if (monthIndex !== -1 && day > 0) {
              if (!newCheckedCells[personnelId]) {
                newCheckedCells[personnelId] = {};
              }
              if (!newCheckedCells[personnelId][monthIndex]) {
                newCheckedCells[personnelId][monthIndex] = {};
              }
              if (!newCheckedCells[personnelId][monthIndex][day]) {
                newCheckedCells[personnelId][monthIndex][day] = {
                  morning: { checked: false, typeId: null },
                  afternoon: { checked: false, typeId: null }
                };
              }
              
              const period = creneau === 'Matinée' ? 'morning' : 'afternoon';
              newCheckedCells[personnelId][monthIndex][day][period] = {
                checked: true,
                typeId: typeCongeId
              };
            }
          } catch (error) {
            console.error(`Erreur traitement congé ${index + 1}:`, error, conge);
          }
        });
        
        // Définir l'état initial et actuel
        const initialState = JSON.parse(JSON.stringify(newCheckedCells));
        
        setCheckedCells(newCheckedCells);
        setInitialCheckedCells(initialState);
        
        // Réinitialiser l'état des changements
        setHasUnsavedChanges(false);
        
        // Marquer l'initialisation comme terminée
        setIsInitialized(true);
        
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [currentYear, refreshTrigger]);

  // Effect pour filtrer les personnels quand le filtre change
  useEffect(() => {
    if (allPersonnels.length > 0) {
      const filteredPersonnels = filterPersonnels();
      setPersonnels(filteredPersonnels);
    }
  }, [filterMode, selectedService, selectedGroupe, allPersonnels]);

  // Effect pour détecter les changements - seulement après initialisation
  useEffect(() => {
    // Ne vérifier que si l'initialisation est terminée
    if (!isInitialized) {
      return;
    }
    
    // Ne vérifier que si les deux états sont initialisés
    if (Object.keys(initialCheckedCells).length === 0 || Object.keys(checkedCells).length === 0) {
      return;
    }
    
    const changes = getChanges();
    const detectedChanges = changes.toAdd.length > 0 || changes.toRemove.length > 0;
    
    // Mise à jour seulement si nécessaire
    if (detectedChanges !== hasUnsavedChanges) {
      setHasUnsavedChanges(detectedChanges);
    }
  }, [checkedCells, initialCheckedCells, conges, isInitialized]);

  // Styles CSS inline avec nouvelle structure d'en-tête
  const styles = {
    container: {
      width: '100%',
      backgroundColor: '#f9fafb',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif'
    },
    headerContainer: {
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      backgroundColor: '#f9fafb',
      borderBottom: '1px solid #e5e7eb',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    headerRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '8px 16px',
      gap: '16px',
      flexWrap: 'wrap'
    },
    firstRow: {
      borderBottom: '1px solid #e5e7eb'
    },
    content: {
      padding: '16px'
    },
    button: {
      padding: '8px 16px',
      backgroundColor: '#3b82f6',
      color: 'white',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    },
    buttonHover: {
      backgroundColor: '#2563eb'
    },
    yearSelector: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    yearInput: {
      padding: '8px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      textAlign: 'center',
      fontSize: '20px',
      fontWeight: 'bold',
      width: '140px',
      minWidth: '140px'
    },
    select: {
      padding: '8px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '14px',
      backgroundColor: 'white'
    },
    filterSelect: {
      padding: '8px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '14px',
      backgroundColor: 'white',
      minWidth: '180px'
    },
    // Styles pour le switch
    switchContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '4px',
      backgroundColor: '#f3f4f6',
      borderRadius: '8px',
      border: '1px solid #d1d5db'
    },
    switchButton: {
      padding: '6px 12px',
      borderRadius: '6px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '500',
      transition: 'all 0.2s'
    },
    switchButtonActive: {
      backgroundColor: '#3b82f6',
      color: 'white'
    },
    switchButtonInactive: {
      backgroundColor: 'transparent',
      color: '#6b7280'
    },
    saveButton: {
      padding: '8px 16px',
      backgroundColor: '#10b981',
      color: 'white',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      fontWeight: 'bold',
      fontSize: '14px'
    },
    modeBadge: {
      padding: '4px 8px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '500',
      border: '1px solid'
    },
    scrollContainer: {
      overflowX: 'auto'
    },
    monthsContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    },
    monthCard: {
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      padding: '16px'
    },
    gridContainer: {
      display: 'grid',
      gap: '4px',
      minWidth: 'fit-content'
    },
    monthName: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#374151',
      width: '150px'
    },
    dayColumn: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    },
    dayHeader: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px',
      borderRadius: '4px',
      border: '1px solid',
      width: '40px',
      height: '48px',
      padding: '4px'
    },
    maContainer: {
      width: '40px',
      border: '1px solid',
      borderRadius: '4px',
      display: 'flex',
      height: '24px'
    },
    maCell: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px',
      fontWeight: '600'
    },
    maCellBorderRight: {
      borderRight: '1px solid'
    },
    personName: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingRight: '8px',
      fontSize: '12px',
      fontWeight: '500',
      color: '#374151',
      width: '150px',
      lineHeight: '1.2',
      textAlign: 'right',
      wordWrap: 'break-word',
      overflowWrap: 'break-word',
      hyphens: 'auto'
    },
    personCell: {
      width: '40px',
      height: '32px',
      border: '1px solid #d1d5db',
      borderRadius: '4px',
      display: 'flex'
    },
    personCellHalf: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px',
      fontWeight: 'bold',
      transition: 'background-color 0.2s'
    },
    personCellHalfBorder: {
      borderRight: '1px solid #d1d5db'
    },
    personCellUnchecked: {
      backgroundColor: '#f9fafb',
      color: 'transparent'
    },
    // Styles pour les cellules non modifiables
    personCellDisabled: {
      cursor: 'not-allowed',
      opacity: 0.5
    },
    loading: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '200px',
      fontSize: '18px',
      color: '#6b7280',
      gap: '16px'
    }
  };

  // Fonction pour formater le nom des personnes sur plusieurs lignes
  const formatPersonName = (name) => {
    if (name.length > 18) {
      const words = name.split(' ');
      if (words.length >= 2) {
        const firstLine = words.slice(0, Math.ceil(words.length / 2)).join(' ');
        const secondLine = words.slice(Math.ceil(words.length / 2)).join(' ');
        return (
          <>
            {firstLine}
            <br />
            {secondLine}
          </>
        );
      }
    }
    return name;
  };

  // Fonction pour obtenir les jours d'un mois (année scolaire)
  const getDaysInMonth = (schoolYear, schoolMonthIndex) => {
    const actualMonth = getActualMonth(schoolMonthIndex);
    const actualYear = getActualYear(schoolMonthIndex, schoolYear);
    
    const firstDay = new Date(actualYear, actualMonth, 1);
    const lastDay = new Date(actualYear, actualMonth + 1, 0);
    const days = [];
    
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(actualYear, actualMonth, day);
      days.push({
        number: day,
        date,
        dayOfWeek: date.getDay()
      });
    }
    
    return days;
  };

  // Fonction pour vérifier si c'est un jour férié français
  const isHoliday = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    
    const fixedHolidays = [
      { month: 0, day: 1 },   // Jour de l'An
      { month: 4, day: 1 },   // Fête du Travail
      { month: 4, day: 8 },   // Victoire 1945
      { month: 6, day: 14 },  // Fête Nationale
      { month: 7, day: 15 },  // Assomption
      { month: 10, day: 1 },  // Toussaint
      { month: 10, day: 11 }, // Armistice
      { month: 11, day: 25 }  // Noël
    ];
    
    for (const holiday of fixedHolidays) {
      if (month === holiday.month && day === holiday.day) {
        return true;
      }
    }
    
    return false;
  };

  // Fonction pour vérifier si c'est aujourd'hui
  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Fonction pour vérifier si c'est un weekend
  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  // Générer les données des mois (année scolaire)
  const monthsData = useMemo(() => {
    return monthNames.map((name, index) => ({
      name,
      index,
      actualMonth: getActualMonth(index),
      actualYear: getActualYear(index, currentYear),
      days: getDaysInMonth(currentYear, index)
    }));
  }, [currentYear]);

  // Fonctions de navigation
  const goToPreviousYear = () => {
    setCurrentYear(prev => prev - 1);
  };

  const goToNextYear = () => {
    setCurrentYear(prev => prev + 1);
  };

  // Fonction pour recharger les données (sans bouton explicite)
  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Gestion des clics et de la sélection multiple
  const getCellState = (personId, monthIndex, day, period) => {
    return checkedCells[personId]?.[monthIndex]?.[day]?.[period] || { checked: false, typeId: null };
  };

  // setCellState sans conflit avec l'effect de détection
  const setCellState = (personId, monthIndex, day, period, checked, typeId = null) => {
    // VÉRIFICATION : L'utilisateur peut-il modifier ce personnel ?
    if (!canModifyPersonnel(personId)) {
      return;
    }
    
    // Activer immédiatement le bouton avant la mise à jour
    setHasUnsavedChanges(true);
    
    setCheckedCells(prev => {
      const newState = {
        ...prev,
        [personId]: {
          ...prev[personId],
          [monthIndex]: {
            ...prev[personId]?.[monthIndex],
            [day]: {
              ...prev[personId]?.[monthIndex]?.[day],
              [period]: {
                checked: checked,
                typeId: checked ? (typeId || selectedTypeConge) : null
              }
            }
          }
        }
      };
      
      return newState;
    });
  };

  const handleMouseDown = (personId, monthIndex, day, period, e) => {
    e.preventDefault();
    
    // VÉRIFICATION : L'utilisateur peut-il modifier ce personnel ?
    if (!canModifyPersonnel(personId)) {
      return;
    }
    
    setIsSelecting(true);
    setCurrentSelectionPerson(personId);
    setCurrentSelectionMonth(monthIndex);
    
    const currentState = getCellState(personId, monthIndex, day, period);
    const newCheckedState = !currentState.checked;
    setSelectionState(newCheckedState);
    
    setCellState(personId, monthIndex, day, period, newCheckedState, selectedTypeConge);
  };

  const handleMouseEnter = (personId, monthIndex, day, period) => {
    if (isSelecting && 
        personId === currentSelectionPerson && 
        monthIndex === currentSelectionMonth &&
        canModifyPersonnel(personId)) {
      setCellState(personId, monthIndex, day, period, selectionState, selectedTypeConge);
    }
  };

  // Gérer le relâchement de la souris globalement
  useEffect(() => {
    const handleMouseUp = () => {
      setIsSelecting(false);
      setCurrentSelectionPerson(null);
      setCurrentSelectionMonth(null);
      setSelectionState(null);
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // NOUVEAU : Fonction pour recharger les données en conservant les filtres
  const reloadDataWithFilters = async (preservedFilterMode, preservedSelectedService, preservedSelectedGroupe) => {
    try {
      setIsInitialized(false);
      
      // Charger les services
      const servicesData = await gristAPI.getData('Services');
      
      const servicesList = servicesData.map(s => ({
        id: s.id,
        libelle: s.Libelle
      }));
      setServices(servicesList);
      
      // Charger les groupes
      const groupesData = await gristAPI.getData('Groupes');
      
      const groupesList = groupesData.map(g => ({
        id: g.id,
        nom: g.Nom
      }));
      setGroupes(groupesList);
      
      // Charger TOUS les personnels avec la colonne Responsable
      const personnelsData = await gristAPI.getData('Personnels');
      
      const allPersonnelsList = personnelsData.map(p => ({
        id: p.id,
        name: p.PrenomNom || `${p.Prenom} ${p.Nom}`,
        nom: p.Nom,
        prenom: p.Prenom,
        email: p.Email,
        serviceId: p.Service,
        groupes: typeof p.Groupes === 'string' ? JSON.parse(p.Groupes) : (Array.isArray(p.Groupes) ? p.Groupes : []),
        responsable: p.Responsable
      }));
      setAllPersonnels(allPersonnelsList);
      
      // NOUVEAU : Restaurer les filtres sauvegardés
      setFilterMode(preservedFilterMode);
      setSelectedService(preservedSelectedService);
      setSelectedGroupe(preservedSelectedGroupe);
      
      // Filtrer les personnels selon les filtres préservés
      let filteredPersonnels;
      if (preservedFilterMode === 'services') {
        filteredPersonnels = filterPersonnelsByService(preservedSelectedService);
      } else {
        filteredPersonnels = filterPersonnelsByGroupe(preservedSelectedGroupe);
      }
      setPersonnels(filteredPersonnels);
      
      // Charger les types de congés
      const typesData = await gristAPI.getData('Type_Conges');
      setTypeConges(typesData);
      
      // Charger les congés existants
      const congesData = await gristAPI.getData('Conges');
      setConges(congesData);
      
      // Initialiser les cases cochées avec les congés existants
      const newCheckedCells = {};
      
      congesData.forEach((conge, index) => {
        try {
          const date = parseGristDate(conge.Date);
          const personnelId = conge.Personnel;
          const creneau = conge.Creneau;
          const typeCongeId = conge.Type_Conge;
          
          const monthIndex = getSchoolYearMonthIndex(date);
          const day = date.getDate();
          
          if (monthIndex !== -1 && day > 0) {
            if (!newCheckedCells[personnelId]) {
              newCheckedCells[personnelId] = {};
            }
            if (!newCheckedCells[personnelId][monthIndex]) {
              newCheckedCells[personnelId][monthIndex] = {};
            }
            if (!newCheckedCells[personnelId][monthIndex][day]) {
              newCheckedCells[personnelId][monthIndex][day] = {
                morning: { checked: false, typeId: null },
                afternoon: { checked: false, typeId: null }
              };
            }
            
            const period = creneau === 'Matinée' ? 'morning' : 'afternoon';
            newCheckedCells[personnelId][monthIndex][day][period] = {
              checked: true,
              typeId: typeCongeId
            };
          }
        } catch (error) {
          console.error(`Erreur traitement congé ${index + 1}:`, error, conge);
        }
      });
      
      // Définir l'état initial et actuel
      const initialState = JSON.parse(JSON.stringify(newCheckedCells));
      
      setCheckedCells(newCheckedCells);
      setInitialCheckedCells(initialState);
      
      // Réinitialiser l'état des changements
      setHasUnsavedChanges(false);
      
      // Marquer l'initialisation comme terminée
      setIsInitialized(true);
      
    } catch (error) {
      console.error('Erreur lors du rechargement des données:', error);
    }
  };

  // Fonction simplifiée pour sauvegarder les modifications
  const saveConges = async () => {
    try {
      setLoading(true);
      
      const changes = getChanges();
      
      if (changes.toAdd.length === 0 && changes.toRemove.length === 0) {
        alert('ℹ️ Aucune modification à sauvegarder.');
        return;
      }
      
      // VÉRIFICATION : Vérifier les permissions pour chaque modification
      if (isRestrictedUser) {
        // Vérifier les ajouts
        for (const newConge of changes.toAdd) {
          if (!canModifyPersonnel(newConge.Personnel)) {
            if (isResponsable) {
              alert('🚫 Erreur : Vous ne pouvez modifier que vos propres congés et ceux de votre équipe.');
            } else {
              alert('🚫 Erreur : Vous ne pouvez modifier que vos propres congés.');
            }
            return;
          }
        }
        
        // Vérifier les suppressions
        for (const congeId of changes.toRemove) {
          const congeToDelete = conges.find(c => c.id === congeId);
          if (congeToDelete && !canModifyPersonnel(congeToDelete.Personnel)) {
            if (isResponsable) {
              alert('🚫 Erreur : Vous ne pouvez supprimer que vos propres congés et ceux de votre équipe.');
            } else {
              alert('🚫 Erreur : Vous ne pouvez supprimer que vos propres congés.');
            }
            return;
          }
        }
      }
      
      // NOUVEAU : Sauvegarder les filtres actuels avant la sauvegarde
      const currentFilterMode = filterMode;
      const currentSelectedService = selectedService;
      const currentSelectedGroupe = selectedGroupe;
      
      // Supprimer les congés décochés
      for (const congeId of changes.toRemove) {
        await gristAPI.deleteRecord('Conges', congeId);
      }
      
      // Ajouter les nouveaux congés
      for (const newConge of changes.toAdd) {
        await gristAPI.addRecord('Conges', newConge);
      }
      
      alert('✅ Modifications sauvegardées avec succès !');
      
      // Désactiver le bouton
      setHasUnsavedChanges(false);
      
      // NOUVEAU : Recharger les données en conservant les filtres
      await reloadDataWithFilters(currentFilterMode, currentSelectedService, currentSelectedGroupe);
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div>Chargement des données...</div>
        <div style={{fontSize: '14px', color: '#9ca3af'}}>Récupération des congés depuis Grist</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* En-tête avec structure sur deux lignes */}
      <div style={styles.headerContainer}>
        {/* Première ligne : Année, Type de congés, Bouton Sauvegarder */}
        <div style={{...styles.headerRow, ...styles.firstRow}}>
          {/* Sélecteur d'année */}
          <div style={styles.yearSelector}>
            <button 
              style={styles.button}
              onClick={goToPreviousYear}
              onMouseOver={(e) => e.target.style.backgroundColor = styles.buttonHover.backgroundColor}
              onMouseOut={(e) => e.target.style.backgroundColor = styles.button.backgroundColor}
            >
              ◀
            </button>
            
            <input
              type="text"
              value={`${currentYear}-${currentYear + 1}`}
              onChange={(e) => {
                const match = e.target.value.match(/^(\d{4})-(\d{4})$/);
                if (match) {
                  const startYear = parseInt(match[1]);
                  if (!isNaN(startYear) && startYear > 1900 && startYear < 3000) {
                    setCurrentYear(startYear);
                  }
                }
              }}
              style={styles.yearInput}
              placeholder="2025-2026"
            />
            
            <button 
              style={styles.button}
              onClick={goToNextYear}
              onMouseOver={(e) => e.target.style.backgroundColor = styles.buttonHover.backgroundColor}
              onMouseOut={(e) => e.target.style.backgroundColor = styles.button.backgroundColor}
            >
              ▶
            </button>
          </div>
          
          {/* Sélecteur de type de congé */}
          <select 
            value={selectedTypeConge} 
            onChange={(e) => setSelectedTypeConge(parseInt(e.target.value))}
            style={styles.select}
          >
            {typeConges.map(type => (
              <option key={type.id} value={type.id}>
                {type.Code} - {type.Libelle}
              </option>
            ))}
          </select>
          
          {/* Bouton Sauvegarder */}
          <button 
            style={{
              ...styles.saveButton,
              backgroundColor: hasUnsavedChanges ? '#10b981' : '#9ca3af'
            }}
            onClick={saveConges}
            disabled={loading || !hasUnsavedChanges}
            title={hasUnsavedChanges ? 'Cliquez pour sauvegarder les modifications' : 'Aucune modification détectée'}
          >
            💾 Sauvegarder
          </button>
        </div>
        
        {/* Deuxième ligne : Switch, Sélecteur Services/Groupes, Badge Mode */}
        <div style={styles.headerRow}>
          {/* Switch Services/Groupes */}
          <div style={styles.switchContainer}>
            <button
              style={{
                ...styles.switchButton,
                ...(filterMode === 'services' ? styles.switchButtonActive : styles.switchButtonInactive)
              }}
              onClick={() => setFilterMode('services')}
            >
              🏢 Services
            </button>
            <button
              style={{
                ...styles.switchButton,
                ...(filterMode === 'groupes' ? styles.switchButtonActive : styles.switchButtonInactive)
              }}
              onClick={() => setFilterMode('groupes')}
            >
              👥 Groupes
            </button>
          </div>
          
          {/* Sélecteur conditionnel Services/Groupes */}
          {filterMode === 'services' ? (
            <select 
              value={selectedService || ''} 
              onChange={(e) => setSelectedService(parseInt(e.target.value))}
              style={styles.filterSelect}
            >
              {services.map(service => (
                <option key={service.id} value={service.id}>
                  🏢 {service.libelle}
                </option>
              ))}
            </select>
          ) : (
            <select 
              value={selectedGroupe || ''} 
              onChange={(e) => setSelectedGroupe(parseInt(e.target.value))}
              style={styles.filterSelect}
            >
              {groupes.map(groupe => (
                <option key={groupe.id} value={groupe.id}>
                  👥 {groupe.nom}
                </option>
              ))}
            </select>
          )}
          
          {/* Badge Mode personnel/responsable */}
          {isRestrictedUser && (
            <div style={{
              ...styles.modeBadge,
              backgroundColor: isResponsable ? '#dcfce7' : '#fef3c7',
              color: isResponsable ? '#166534' : '#92400e',
              borderColor: isResponsable ? '#22c55e' : '#f59e0b'
            }}>
              {isResponsable ? '👥 Mode responsable' : '🔒 Mode personnel'}
            </div>
          )}
        </div>
      </div>

      {/* Contenu principal */}
      <div style={styles.content}>
        <div style={styles.monthsContainer}>
          {monthsData.map((month) => (
            <div key={month.index} style={styles.monthCard}>
              <div style={styles.scrollContainer}>
                <div 
                  style={{
                    ...styles.gridContainer,
                    gridTemplateColumns: `150px repeat(${month.days.length}, 40px)`
                  }}
                >
                  {/* Nom du mois */}
                  <div style={styles.monthName}>
                    {month.name}
                  </div>
                  
                  {/* En-têtes des jours */}
                  {month.days.map((dayInfo) => {
                    const getBorderColor = () => {
                      if (isToday(dayInfo.date)) return '#3b82f6';
                      if (isHoliday(dayInfo.date)) return '#fca5a5';
                      if (isWeekend(dayInfo.date)) return '#fb923c';
                      return '#e5e7eb';
                    };

                    const getTextColor = () => {
                      if (isToday(dayInfo.date)) return 'white';
                      if (isHoliday(dayInfo.date)) return '#991b1b';
                      if (isWeekend(dayInfo.date)) return '#9a3412';
                      return '#374151';
                    };

                    const getBackgroundColor = () => {
                      if (isToday(dayInfo.date)) return '#3b82f6';
                      if (isHoliday(dayInfo.date)) return '#fecaca';
                      if (isWeekend(dayInfo.date)) return '#fed7aa';
                      return '#f3f4f6';
                    };

                    const getMaStyle = () => ({
                      backgroundColor: getBackgroundColor(),
                      borderColor: getBorderColor()
                    });

                    return (
                      <div key={dayInfo.number} style={styles.dayColumn}>
                        <div 
                          style={{
                            ...styles.dayHeader,
                            backgroundColor: getBackgroundColor(),
                            color: getTextColor(),
                            borderColor: getBorderColor(),
                            fontWeight: isToday(dayInfo.date) ? 'bold' : (isHoliday(dayInfo.date) || isWeekend(dayInfo.date)) ? '600' : 'normal'
                          }}
                          title={`${dayNamesShort[dayInfo.dayOfWeek]} ${dayInfo.number} ${month.name} ${month.actualYear}${
                            isToday(dayInfo.date) ? ' (Aujourd\'hui)' :
                            isHoliday(dayInfo.date) ? ' (Jour férié)' :
                            isWeekend(dayInfo.date) ? ' (Week-end)' : ''
                          }`}
                        >
                          <div style={{fontSize: '12px', lineHeight: '1'}}>
                            {dayNamesShort[dayInfo.dayOfWeek]}
                          </div>
                          <div style={{fontSize: '12px', lineHeight: '1', marginTop: '2px'}}>
                            {dayInfo.number}
                          </div>
                        </div>
                        
                        <div style={{...styles.maContainer, ...getMaStyle()}}>
                          <div style={{
                            ...styles.maCell,
                            ...styles.maCellBorderRight,
                            color: getTextColor(),
                            borderRightColor: getBorderColor()
                          }}>
                            M
                          </div>
                          <div style={{
                            ...styles.maCell,
                            color: getTextColor()
                          }}>
                            A
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Lignes des personnes */}
                  {personnels.map((person) => {
                    // Vérifier si cette personne peut être modifiée
                    const canModifyThisPerson = canModifyPersonnel(person.id);
                    
                    return (
                      <React.Fragment key={person.id}>
                        <div style={{
                          ...styles.personName,
                          // Style différent pour l'utilisateur connecté
                          fontWeight: person.id === userPersonnelId ? 'bold' : '500',
                          color: person.id === userPersonnelId ? '#059669' : 
                                (canModifyThisPerson && isRestrictedUser ? '#2563eb' : '#374151')
                        }}>
                          {person.id === userPersonnelId && '👤 '}
                          {person.id !== userPersonnelId && canModifyThisPerson && isRestrictedUser && '👥 '}
                          {formatPersonName(person.name)}
                        </div>
                        
                        {month.days.map((dayInfo) => {
                          const morningState = getCellState(person.id, month.index, dayInfo.number, 'morning');
                          const afternoonState = getCellState(person.id, month.index, dayInfo.number, 'afternoon');
                          
                          // Obtenir les infos de type pour chaque période
                          const morningTypeInfo = morningState.checked ? getTypeCongeInfo(morningState.typeId) : null;
                          const afternoonTypeInfo = afternoonState.checked ? getTypeCongeInfo(afternoonState.typeId) : null;
                          
                          return (
                            <div key={`${person.id}-${dayInfo.number}`} style={styles.personCell}>
                              {/* Matinée */}
                              <div 
                                style={{
                                  ...styles.personCellHalf,
                                  ...styles.personCellHalfBorder,
                                  backgroundColor: morningState.checked ? morningTypeInfo.couleur : '#f9fafb',
                                  color: morningState.checked ? '#ffffff' : 'transparent',
                                  userSelect: 'none',
                                  // Styles pour les cellules non modifiables
                                  cursor: canModifyThisPerson ? 'pointer' : 'not-allowed',
                                  opacity: canModifyThisPerson ? 1 : 0.5
                                }}
                                title={`${person.name} - Matinée du ${dayInfo.number} ${month.name} ${morningState.checked ? `(${morningTypeInfo.libelle})` : '(Non cochée)'}${
                                  !canModifyThisPerson ? ' - Modification non autorisée' : ''
                                }`}
                                onMouseDown={canModifyThisPerson ? (e) => handleMouseDown(person.id, month.index, dayInfo.number, 'morning', e) : undefined}
                                onMouseEnter={canModifyThisPerson ? () => handleMouseEnter(person.id, month.index, dayInfo.number, 'morning') : undefined}
                                onMouseOver={canModifyThisPerson ? (e) => {
                                  if (!morningState.checked) {
                                    const selectedTypeInfo = getTypeCongeInfo(selectedTypeConge);
                                    e.target.style.backgroundColor = selectedTypeInfo.couleur;
                                    e.target.style.opacity = '0.5';
                                  } else {
                                    e.target.style.opacity = '0.8';
                                  }
                                } : undefined}
                                onMouseOut={canModifyThisPerson ? (e) => {
                                  if (!morningState.checked) {
                                    e.target.style.backgroundColor = '#f9fafb';
                                    e.target.style.opacity = '1';
                                  } else {
                                    e.target.style.backgroundColor = morningTypeInfo.couleur;
                                    e.target.style.opacity = '1';
                                  }
                                } : undefined}
                              >
                                {morningState.checked ? morningTypeInfo.code : ''}
                              </div>
                              
                              {/* Après-midi */}
                              <div 
                                style={{
                                  ...styles.personCellHalf,
                                  backgroundColor: afternoonState.checked ? afternoonTypeInfo.couleur : '#f9fafb',
                                  color: afternoonState.checked ? '#ffffff' : 'transparent',
                                  userSelect: 'none',
                                  // Styles pour les cellules non modifiables
                                  cursor: canModifyThisPerson ? 'pointer' : 'not-allowed',
                                  opacity: canModifyThisPerson ? 1 : 0.5
                                }}
                                title={`${person.name} - Après-midi du ${dayInfo.number} ${month.name} ${afternoonState.checked ? `(${afternoonTypeInfo.libelle})` : '(Non cochée)'}${
                                  !canModifyThisPerson ? ' - Modification non autorisée' : ''
                                }`}
                                onMouseDown={canModifyThisPerson ? (e) => handleMouseDown(person.id, month.index, dayInfo.number, 'afternoon', e) : undefined}
                                onMouseEnter={canModifyThisPerson ? () => handleMouseEnter(person.id, month.index, dayInfo.number, 'afternoon') : undefined}
                                onMouseOver={canModifyThisPerson ? (e) => {
                                  if (!afternoonState.checked) {
                                    const selectedTypeInfo = getTypeCongeInfo(selectedTypeConge);
                                    e.target.style.backgroundColor = selectedTypeInfo.couleur;
                                    e.target.style.opacity = '0.5';
                                  } else {
                                    e.target.style.opacity = '0.8';
                                  }
                                } : undefined}
                                onMouseOut={canModifyThisPerson ? (e) => {
                                  if (!afternoonState.checked) {
                                    e.target.style.backgroundColor = '#f9fafb';
                                    e.target.style.opacity = '1';
                                  } else {
                                    e.target.style.backgroundColor = afternoonTypeInfo.couleur;
                                    e.target.style.opacity = '1';
                                  }
                                } : undefined}
                              >
                                {afternoonState.checked ? afternoonTypeInfo.code : ''}
                              </div>
                            </div>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Informations d'utilisation */}
        <div style={{
          marginTop: '32px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          padding: '16px'
        }}>
          <h4 style={{fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#374151'}}>
            Instructions d'utilisation
          </h4>
          <ul style={{fontSize: '14px', color: '#6b7280', lineHeight: '1.6'}}>
            <li>📊 <strong>Chargement automatique:</strong> Les congés existants sont affichés au démarrage</li>
            <li>⚙️ <strong>Filtres:</strong> Utilisez le switch Services/Groupes pour changer le mode de filtrage</li>
            <li>🏢 <strong>Filtre par service:</strong> Sélectionnez un service pour n'afficher que ses personnels</li>
            <li>👥 <strong>Filtre par groupe:</strong> Sélectionnez un groupe pour n'afficher que ses membres</li>
            <li>🎨 <strong>Types de congés:</strong> Chaque type a son code et sa couleur (C=vert, M=bleu, etc.)</li>
            <li>🎯 <strong>Sélection:</strong> Choisissez le type de congé avant la saisie</li>
            <li>🖱️ <strong>Interaction:</strong> Cliquez sur M (Matinée) ou A (Après-midi) pour marquer les congés</li>
            <li>✨ <strong>Aperçu:</strong> En survolant une case, vous voyez la couleur du type sélectionné</li>
            <li>💾 <strong>Sauvegarde:</strong> Le bouton se colore quand il y a des modifications</li>
            {isRestrictedUser && !isResponsable && (
              <li>🔒 <strong>Mode personnel:</strong> Vous ne pouvez modifier que vos propres congés</li>
            )}
            {isRestrictedUser && isResponsable && (
              <li>👥 <strong>Mode responsable:</strong> Vous pouvez modifier vos congés et ceux de votre équipe</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};