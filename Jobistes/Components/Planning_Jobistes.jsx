const Component = () => {
  // État pour la semaine actuelle
  const [currentWeek, setCurrentWeek] = useState(new Date());
  
  // États pour la sélection de cellules
  const [selectedCells, setSelectedCells] = useState(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [currentSelectionDay, setCurrentSelectionDay] = useState(null);
  const [renderKey, setRenderKey] = useState(0);
  
  // Référence pour le conteneur de scroll
  const scrollContainerRef = useRef(null);

  // Fonction pour obtenir le début de la semaine (lundi)
  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajustement pour que lundi soit le premier jour
    return new Date(d.setDate(diff));
  };

  // Génération des jours de la semaine
  const weekDays = useMemo(() => {
    const start = getWeekStart(currentWeek);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  }, [currentWeek]);

  // Génération des heures (pas de 30 minutes)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }, []);

  // Navigation entre les semaines
  const navigateWeek = (direction) => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() + (direction * 7));
    setCurrentWeek(newWeek);
    clearSelection(); // Effacer la sélection lors du changement de semaine
  };

  // Aller à la semaine actuelle
  const goToCurrentWeek = () => {
    setCurrentWeek(new Date());
    clearSelection(); // Effacer la sélection
  };

  // Vérifier si un jour est aujourd'hui
  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Fonctions de gestion de la sélection
  const getCellId = (dayIndex, timeIndex) => `${dayIndex}-${timeIndex}`;
  
  const handleCellMouseDown = (dayIndex, timeIndex) => {
    const cellId = getCellId(dayIndex, timeIndex);
    setIsSelecting(true);
    setSelectionStart({ dayIndex, timeIndex });
    setCurrentSelectionDay(dayIndex);
    
    // Commencer une nouvelle sélection et forcer le re-rendu pour nettoyer les anciens styles
    setSelectedCells(new Set([cellId]));
    setRenderKey(prev => prev + 1);
  };

  const handleCellMouseEnter = (dayIndex, timeIndex) => {
    // Vérifications de sécurité
    if (!isSelecting || !selectionStart || currentSelectionDay !== dayIndex) return;
    
    const startTimeIndex = selectionStart.timeIndex;
    const endTimeIndex = timeIndex;
    
    // Créer la sélection de cellules pour la plage
    const newSelection = new Set();
    const minTime = Math.min(startTimeIndex, endTimeIndex);
    const maxTime = Math.max(startTimeIndex, endTimeIndex);
    
    for (let t = minTime; t <= maxTime; t++) {
      newSelection.add(getCellId(dayIndex, t));
    }
    
    setSelectedCells(newSelection);
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
    setSelectionStart(null);
    setCurrentSelectionDay(null);
  };

  // Empêcher le comportement de drag par défaut
  const handleMouseDown = (e, dayIndex, timeIndex) => {
    e.preventDefault(); // Empêcher la sélection de texte et le drag
    handleCellMouseDown(dayIndex, timeIndex);
  };

  // Fonction pour obtenir les informations de la sélection
  const getSelectionInfo = () => {
    if (selectedCells.size === 0) return null;

    // Récupérer toutes les cellules sélectionnées et les analyser
    const selectedArray = Array.from(selectedCells);
    const cellsInfo = selectedArray.map(cellId => {
      const [dayIndex, timeIndex] = cellId.split('-').map(Number);
      return { dayIndex, timeIndex };
    });

    // Trouver le jour (tous les créneaux sont sur le même jour)
    const dayIndex = cellsInfo[0].dayIndex;
    const selectedDay = weekDays[dayIndex];

    // Trouver les heures de début et fin
    const timeIndices = cellsInfo.map(cell => cell.timeIndex).sort((a, b) => a - b);
    const startTimeIndex = timeIndices[0];
    const endTimeIndex = timeIndices[timeIndices.length - 1] + 1; // +1 car la fin est exclusive

    const startTime = timeSlots[startTimeIndex];
    const endTime = endTimeIndex < timeSlots.length ? timeSlots[endTimeIndex] : "24:00";

    return {
      day: selectedDay,
      dayName: useShortDayNames ? formatDayNameShort(selectedDay) : formatDayName(selectedDay),
      dayDate: formatDate(selectedDay),
      startTime,
      endTime,
      duration: selectedCells.size * 30 // Durée en minutes
    };
  };

  const isCellSelected = (dayIndex, timeIndex) => {
    return selectedCells.has(getCellId(dayIndex, timeIndex));
  };

  // Effacer la sélection
  const clearSelection = () => {
    setSelectedCells(new Set());
    setIsSelecting(false);
    setSelectionStart(null);
    setCurrentSelectionDay(null);
    // Forcer le re-rendu pour nettoyer les styles inline
    setRenderKey(prev => prev + 1);
  };

  // Effet pour positionner le scroll sur 08h00 au chargement
  useEffect(() => {
    if (scrollContainerRef.current) {
      const scrollContainer = scrollContainerRef.current;
      
      // Petit délai pour s'assurer que le DOM est entièrement rendu
      setTimeout(() => {
        // Trouver la ligne correspondant à 08h00
        const rows = scrollContainer.querySelectorAll('tbody tr');
        const hour8Index = 16; // Index de 08h00 dans timeSlots
        
        if (rows[hour8Index]) {
          // Obtenir la hauteur de l'en-tête sticky
          const headerRow = scrollContainer.querySelector('thead tr');
          const headerHeight = headerRow ? headerRow.offsetHeight : 0;
          
          // Obtenir la position de la ligne 08h00
          const targetRow = rows[hour8Index];
          const rowOffsetTop = targetRow.offsetTop;
          
          // Positionner pour que 08h00 soit visible juste après l'en-tête
          const scrollTop = rowOffsetTop - headerHeight;
          
          scrollContainer.scrollTop = scrollTop;
        }
      }, 200);
    }
  }, [currentWeek]); // Repositionner quand la semaine change

  // Effet pour gérer les événements globaux de souris
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isSelecting) {
        setIsSelecting(false);
        setSelectionStart(null);
        setCurrentSelectionDay(null);
      }
    };

    // Ajouter l'événement global
    document.addEventListener('mouseup', handleGlobalMouseUp);
    
    // Nettoyer l'événement au démontage
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isSelecting]);

  // Formatage des dates
  const formatDate = (date) => {
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit' 
    });
  };

  const formatDayName = (date) => {
    return date.toLocaleDateString('fr-FR', { weekday: 'long' });
  };

  // Fonction pour obtenir le nom du jour en format court (3 lettres)
  const formatDayNameShort = (date) => {
    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    return dayNames[date.getDay()];
  };

  // Hook pour détecter la largeur des cellules et choisir le format approprié
  const [useShortDayNames, setUseShortDayNames] = useState(false);
  
  useEffect(() => {
    const checkCellWidth = () => {
      if (scrollContainerRef.current) {
        const table = scrollContainerRef.current.querySelector('table');
        if (table) {
          const tableWidth = table.offsetWidth;
          const timeColumnWidth = 80;
          const availableWidth = tableWidth - timeColumnWidth;
          const cellWidth = availableWidth / 7;
          
          // Si la largeur de cellule est inférieure à 100px, utiliser les noms courts
          setUseShortDayNames(cellWidth < 100);
        }
      }
    };

    // Vérifier au montage et lors des redimensionnements
    checkCellWidth();
    window.addEventListener('resize', checkCellWidth);
    
    // Petit délai pour s'assurer que le DOM est rendu
    const timeout = setTimeout(checkCellWidth, 100);

    return () => {
      window.removeEventListener('resize', checkCellWidth);
      clearTimeout(timeout);
    };
  }, [currentWeek]);

  const styles = {
    container: {
      width: '100%',
      height: '100%', // S'adapter à la zone d'affichage GRIST au lieu de 100vh
      maxHeight: '100%', // Limiter la hauteur maximale
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f5f5f5',
      overflow: 'hidden' // Empêcher tout débordement du container principal
    },
    header: {
      padding: '1rem',
      backgroundColor: '#fff',
      borderBottom: '2px solid #ddd',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '1rem',
      flexShrink: 0 // Empêcher la compression de l'en-tête
    },
    navigationControls: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      flexWrap: 'wrap'
    },
    navButton: {
      padding: '0.5rem 0.75rem',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '1.1rem',
      fontWeight: 'bold',
      transition: 'background-color 0.2s',
      minWidth: '40px'
    },
    navButtonHover: {
      backgroundColor: '#0056b3'
    },
    currentWeekButton: {
      padding: '0.5rem 1rem',
      backgroundColor: '#28a745',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '0.9rem'
    },
    calendarContainer: {
      flex: 1,
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: '#fff',
      minHeight: 0 // Important pour permettre au flex child de se réduire
    },
    scrollContainer: {
      width: '100%',
      height: '100%',
      overflow: 'auto'
    },
    table: {
      width: '100%', // Utiliser 100% au lieu de minWidth fixe
      height: 'auto',
      borderCollapse: 'separate',
      borderSpacing: 0,
      tableLayout: 'fixed' // Layout fixe pour un contrôle précis des largeurs
    },
    headerRow: {
      zIndex: 10,
      backgroundColor: '#fff'
    },
    timeHeader: {
      position: 'sticky',
      left: 0,
      top: 0,
      zIndex: 25,
      backgroundColor: '#f8f9fa',
      borderRight: '2px solid #ddd',
      borderBottom: '1px solid #ddd',
      userSelect: 'none',
      pointerEvents: 'none',
      width: '80px', // Largeur fixe pour la colonne des heures
      minWidth: '80px',
      maxWidth: '80px'
    },
    dayHeaderSticky: {
      width: 'calc((100% - 80px) / 7)', // Répartition égale des 7 jours sur l'espace restant
      padding: '1rem 0.25rem',
      textAlign: 'center',
      backgroundColor: '#f8f9fa',
      borderRight: '1px solid #ddd',
      borderBottom: '1px solid #ddd',
      fontWeight: 'bold',
      fontSize: '0.8rem',
      position: 'sticky',
      top: 0,
      zIndex: 20,
      userSelect: 'none',
      pointerEvents: 'none',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },
    dayHeaderToday: {
      width: 'calc((100% - 80px) / 7)',
      padding: '1rem 0.25rem',
      textAlign: 'center',
      backgroundColor: '#87CEEB',
      color: '#333',
      borderRight: '1px solid #ddd',
      borderBottom: '1px solid #ddd',
      fontWeight: 'bold',
      fontSize: '0.8rem',
      position: 'sticky',
      top: 0,
      zIndex: 20,
      userSelect: 'none',
      pointerEvents: 'none',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },
    timeCell: {
      position: 'sticky',
      left: 0,
      zIndex: 15,
      width: '80px',
      minWidth: '80px',
      maxWidth: '80px',
      padding: '0.3rem 0.25rem',
      textAlign: 'center',
      verticalAlign: 'top',
      backgroundColor: '#f8f9fa',
      borderRight: '2px solid #ddd',
      borderBottom: '1px solid #eee',
      fontSize: '0.7rem',
      fontWeight: '500',
      userSelect: 'none',
      pointerEvents: 'none'
    },
    dataCell: {
      width: 'calc((100% - 80px) / 7)',
      height: '40px',
      borderRight: '1px solid #eee',
      borderBottom: '1px solid #eee',
      padding: 0,
      backgroundColor: '#fff',
      cursor: 'pointer',
      transition: 'background-color 0.1s',
      userSelect: 'none',
      overflow: 'hidden' // Empêcher le débordement du contenu
    },
    dataCellHover: {
      backgroundColor: '#e3f2fd'
    },
    dataCellSelected: {
      backgroundColor: '#4CAF50',
      border: '2px solid #2E7D32'
    },
    dayName: {
      textTransform: 'capitalize',
      fontSize: '0.8rem',
      color: '#333',
      lineHeight: '1.1'
    },
    dayDate: {
      fontSize: '0.7rem',
      color: '#666',
      marginTop: '0.2rem',
      lineHeight: '1.1'
    },
    weekInfo: {
      fontSize: '1.1rem',
      color: '#333',
      fontWeight: '500'
    },
    actionBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#fff',
      borderTop: '2px solid #ddd',
      padding: '1rem',
      display: 'flex',
      justifyContent: 'center',
      gap: '1rem',
      zIndex: 100,
      boxShadow: '0 -2px 10px rgba(0,0,0,0.1)'
    },
    actionButton: {
      padding: '0.75rem 1.5rem',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '1rem',
      fontWeight: 'bold',
      transition: 'all 0.2s',
      minWidth: '150px'
    },
    newEventButton: {
      backgroundColor: '#28a745',
      color: 'white'
    },
    cancelButton: {
      backgroundColor: '#dc3545',
      color: 'white'
    }
  };

  return (
    <div style={styles.container}>
      {/* En-tête avec navigation */}
      <div style={styles.header}>
        <div style={styles.weekInfo}>
          Semaine du {formatDate(weekDays[0])} au {formatDate(weekDays[6])}
        </div>
        <div style={styles.navigationControls}>
          <button 
            style={styles.navButton}
            onMouseOver={(e) => e.target.style.backgroundColor = styles.navButtonHover.backgroundColor}
            onMouseOut={(e) => e.target.style.backgroundColor = styles.navButton.backgroundColor}
            onClick={() => navigateWeek(-1)}
            title="Semaine précédente"
          >
            ‹
          </button>
          <button 
            style={styles.currentWeekButton}
            onClick={goToCurrentWeek}
            title="Aller à la semaine actuelle"
          >
            Aujourd'hui
          </button>
          <button 
            style={styles.navButton}
            onMouseOver={(e) => e.target.style.backgroundColor = styles.navButtonHover.backgroundColor}
            onMouseOut={(e) => e.target.style.backgroundColor = styles.navButton.backgroundColor}
            onClick={() => navigateWeek(1)}
            title="Semaine suivante"
          >
            ›
          </button>
        </div>
      </div>

      {/* Conteneur du calendrier avec scroll */}
      <div style={{
        ...styles.calendarContainer,
        marginBottom: selectedCells.size > 0 ? '100px' : '0'
      }} onMouseUp={handleMouseUp}>
        <div style={styles.scrollContainer} ref={scrollContainerRef}>
          <table style={styles.table}>
            {/* En-tête des jours (fixe) */}
            <thead>
              <tr style={styles.headerRow}>
                <th style={styles.timeHeader}>
                  Heure
                </th>
                {weekDays.map((day, index) => (
                  <th key={index} style={isToday(day) ? styles.dayHeaderToday : styles.dayHeaderSticky}>
                    <div style={styles.dayName}>
                      {useShortDayNames ? formatDayNameShort(day) : formatDayName(day)}
                    </div>
                    <div style={styles.dayDate}>
                      {formatDate(day)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Corps du tableau avec créneaux horaires */}
            <tbody>
              {timeSlots.map((timeSlot, timeIndex) => (
                <tr key={timeIndex}>
                  {/* Cellule de l'heure (fixe) */}
                  <td 
                    style={styles.timeCell}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={(e) => e.preventDefault()}
                  >
                    {timeSlot}
                  </td>
                  
                  {/* Cellules des jours */}
                  {weekDays.map((day, dayIndex) => {
                    const isSelected = isCellSelected(dayIndex, timeIndex);
                    return (
                      <td 
                        key={`${timeIndex}-${dayIndex}-${renderKey}`}
                        style={{
                          ...styles.dataCell,
                          ...(isSelected ? styles.dataCellSelected : {})
                        }}
                        onMouseDown={(e) => handleMouseDown(e, dayIndex, timeIndex)}
                        onMouseEnter={() => handleCellMouseEnter(dayIndex, timeIndex)}
                        onMouseOver={(e) => {
                          if (!isSelected) {
                            e.target.style.backgroundColor = styles.dataCellHover.backgroundColor;
                          }
                        }}
                        onMouseOut={(e) => {
                          // Laisser React gérer les styles via le re-rendu
                          if (!isSelected) {
                            e.target.style.backgroundColor = styles.dataCell.backgroundColor;
                          }
                        }}
                      >
                        {/* Contenu de la cellule - ici vous pouvez ajouter des événements */}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Zone d'action fixe en bas */}
      {selectedCells.size > 0 && (
        <div style={styles.actionBar}>
          <button 
            style={{...styles.actionButton, ...styles.newEventButton}}
            onClick={() => {
              const selectionInfo = getSelectionInfo();
              if (selectionInfo) {
                const message = `Nouvelle vacation:\n\n` +
                  `Jour: ${selectionInfo.dayName} ${selectionInfo.dayDate}\n` +
                  `Heure de début: ${selectionInfo.startTime}\n` +
                  `Heure de fin: ${selectionInfo.endTime}\n` +
                  `Durée: ${selectionInfo.duration} minutes`;
                
                alert(message);
                
                // Ici vous pouvez ajouter votre logique de création de vacation
                console.log('Informations de la vacation:', selectionInfo);
              }
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#218838'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}
          >
            Nouvelle vacation
          </button>
          <button 
            style={{...styles.actionButton, ...styles.cancelButton}}
            onClick={clearSelection}
            onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
          >
            Annuler
          </button>
        </div>
      )}
    </div>
  );
};