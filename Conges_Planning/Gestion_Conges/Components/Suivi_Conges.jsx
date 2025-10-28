const Component = () => {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  // État pour stocker les cases cochées : {personId: {monthIndex: {day: {morning: boolean, afternoon: boolean}}}}
  const [checkedCells, setCheckedCells] = useState({});
  
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
      // Septembre à Décembre de l'année courante
      return schoolYearIndex + 8;
    } else {
      // Janvier à Août de l'année suivante
      return schoolYearIndex - 4;
    }
  };

  // Obtenir l'année réelle pour un mois donné
  const getActualYear = (schoolYearIndex, baseYear) => {
    if (schoolYearIndex < 4) {
      // Septembre à Décembre de l'année courante
      return baseYear;
    } else {
      // Janvier à Août de l'année suivante
      return baseYear + 1;
    }
  };

  // Noms des jours de la semaine (forme réduite)
  const dayNamesShort = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'];

  // Liste des personnes
  const people = [
    { id: 'jean', name: 'Jean Delaponte des Feuilles' },
    { id: 'pierre', name: 'Pierre S' },
    { id: 'marc', name: 'Marc L' }
  ];

  // Styles CSS inline
  const styles = {
    container: {
      width: '100%',
      backgroundColor: '#f9fafb',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif'
    },
    header: {
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      backgroundColor: '#f9fafb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      gap: '16px',
      borderBottom: '1px solid #e5e7eb',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
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
      width: '100px'
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
    dayHeaderToday: {
      backgroundColor: '#3b82f6',
      color: 'white',
      fontWeight: 'bold',
      borderColor: '#3b82f6'
    },
    dayHeaderHoliday: {
      backgroundColor: '#fecaca',
      color: '#991b1b',
      fontWeight: '600',
      borderColor: '#fca5a5'
    },
    dayHeaderWeekend: {
      backgroundColor: '#fed7aa',
      color: '#9a3412',
      borderColor: '#fb923c'
    },
    dayHeaderNormal: {
      backgroundColor: '#f3f4f6',
      color: '#374151',
      borderColor: '#e5e7eb'
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
      width: '100px',
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
      cursor: 'pointer',
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
    personCellChecked: {
      backgroundColor: '#bbf7d0',
      color: '#166534'
    },
    personCellUnchecked: {
      backgroundColor: '#f9fafb',
      color: 'transparent'
    },
    legend: {
      marginTop: '32px',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      padding: '16px'
    },
    legendTitle: {
      fontSize: '18px',
      fontWeight: '600',
      marginBottom: '12px',
      color: '#374151'
    },
    legendSection: {
      marginBottom: '16px'
    },
    legendSubtitle: {
      fontSize: '14px',
      fontWeight: '500',
      marginBottom: '8px',
      color: '#374151'
    },
    legendGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '16px',
      fontSize: '14px'
    },
    legendItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    legendExample: {
      width: '32px',
      height: '32px',
      borderRadius: '4px',
      border: '1px solid',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px'
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
        dayOfWeek: date.getDay() // 0 = dimanche, 1 = lundi, etc.
      });
    }
    
    return days;
  };

  // Fonction pour vérifier si c'est un jour férié français
  const isHoliday = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    
    // Jours fixes
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
    
    // Jours variables (simplification - Pâques approximatif)
    // Pour une vraie application, utiliser une librairie de calcul de Pâques
    const easter = getEasterDate(year);
    const easterMonday = new Date(easter);
    easterMonday.setDate(easter.getDate() + 1);
    const ascension = new Date(easter);
    ascension.setDate(easter.getDate() + 39);
    const pentecostMonday = new Date(easter);
    pentecostMonday.setDate(easter.getDate() + 50);
    
    const variableHolidays = [easter, easterMonday, ascension, pentecostMonday];
    
    for (const holiday of variableHolidays) {
      if (date.toDateString() === holiday.toDateString()) {
        return true;
      }
    }
    
    return false;
  };

  // Calcul approximatif de Pâques (algorithme de Gauss simplifié)
  const getEasterDate = (year) => {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    
    return new Date(year, month, day);
  };

  // Fonction pour vérifier si c'est aujourd'hui
  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Fonction pour vérifier si c'est un weekend
  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6; // Dimanche ou Samedi
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

  // Gestion des clics et de la sélection multiple
  const getCellState = (personId, monthIndex, day, period) => {
    return checkedCells[personId]?.[monthIndex]?.[day]?.[period] || false;
  };

  const setCellState = (personId, monthIndex, day, period, checked) => {
    setCheckedCells(prev => ({
      ...prev,
      [personId]: {
        ...prev[personId],
        [monthIndex]: {
          ...prev[personId]?.[monthIndex],
          [day]: {
            ...prev[personId]?.[monthIndex]?.[day],
            [period]: checked
          }
        }
      }
    }));
  };

  const handleMouseDown = (personId, monthIndex, day, period, e) => {
    e.preventDefault();
    
    // Démarre la sélection multiple
    setIsSelecting(true);
    setCurrentSelectionPerson(personId);
    setCurrentSelectionMonth(monthIndex);
    
    // Détermine l'état de sélection (inverse de l'état actuel)
    const currentState = getCellState(personId, monthIndex, day, period);
    setSelectionState(!currentState);
    
    // Toggle la case actuelle
    setCellState(personId, monthIndex, day, period, !currentState);
  };

  const handleMouseEnter = (personId, monthIndex, day, period) => {
    // Continue la sélection si on est en train de sélectionner
    // et que c'est la même personne et le même mois
    if (isSelecting && 
        personId === currentSelectionPerson && 
        monthIndex === currentSelectionMonth) {
      setCellState(personId, monthIndex, day, period, selectionState);
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

  return (
    <div style={styles.container}>
      {/* En-tête avec navigation - reste fixe en haut */}
      <div style={styles.header}>
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
          placeholder="2024-2025"
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

      {/* Contenu scrollable */}
      <div style={styles.content}>
      <div style={styles.monthsContainer}>
        {monthsData.map((month) => (
          <div key={month.index} style={styles.monthCard}>
            <div style={styles.scrollContainer}>
              <div 
                style={{
                  ...styles.gridContainer,
                  gridTemplateColumns: `100px repeat(${month.days.length}, 40px)`
                }}
              >
                {/* Nom du mois */}
                <div style={styles.monthName}>
                  {month.name}
                </div>
                
                {/* En-têtes des jours avec couleurs selon le type */}
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
                      {/* En-tête du jour avec couleur selon le type */}
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
                      
                      {/* Cases M/A avec même couleur */}
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

                {/* Lignes des personnes - alignées sur la même grille */}
                {people.map((person) => (
                  <React.Fragment key={person.id}>
                    {/* Nom de la personne */}
                    <div style={styles.personName}>
                      {formatPersonName(person.name)}
                    </div>
                    
                    {/* Cases pour chaque jour - parfaitement alignées */}
                    {month.days.map((dayInfo) => {
                      const isMorningChecked = getCellState(person.id, month.index, dayInfo.number, 'morning');
                      const isAfternoonChecked = getCellState(person.id, month.index, dayInfo.number, 'afternoon');
                      
                      return (
                        <div key={`${person.id}-${dayInfo.number}`} style={styles.personCell}>
                          {/* Case Matinée - avec 'C' si cochée */}
                          <div 
                            style={{
                              ...styles.personCellHalf,
                              ...styles.personCellHalfBorder,
                              ...(isMorningChecked ? styles.personCellChecked : styles.personCellUnchecked),
                              userSelect: 'none' // Empêche la sélection de texte
                            }}
                            title={`${person.name} - Matinée du ${dayInfo.number} ${month.name} ${isMorningChecked ? '(Cochée)' : '(Non cochée)'}`}
                            onMouseDown={(e) => handleMouseDown(person.id, month.index, dayInfo.number, 'morning', e)}
                            onMouseEnter={() => handleMouseEnter(person.id, month.index, dayInfo.number, 'morning')}
                            onMouseOver={(e) => {
                              if (!isMorningChecked) {
                                e.target.style.backgroundColor = '#dbeafe';
                              } else {
                                e.target.style.backgroundColor = '#86efac';
                              }
                            }}
                            onMouseOut={(e) => {
                              if (!isMorningChecked) {
                                e.target.style.backgroundColor = '#f9fafb';
                              } else {
                                e.target.style.backgroundColor = '#bbf7d0';
                              }
                            }}
                          >
                            {isMorningChecked ? 'C' : ''}
                          </div>
                          
                          {/* Case Après-midi - avec 'C' si cochée */}
                          <div 
                            style={{
                              ...styles.personCellHalf,
                              ...(isAfternoonChecked ? styles.personCellChecked : styles.personCellUnchecked),
                              userSelect: 'none' // Empêche la sélection de texte
                            }}
                            title={`${person.name} - Après-midi du ${dayInfo.number} ${month.name} ${isAfternoonChecked ? '(Cochée)' : '(Non cochée)'}`}
                            onMouseDown={(e) => handleMouseDown(person.id, month.index, dayInfo.number, 'afternoon', e)}
                            onMouseEnter={() => handleMouseEnter(person.id, month.index, dayInfo.number, 'afternoon')}
                            onMouseOver={(e) => {
                              if (!isAfternoonChecked) {
                                e.target.style.backgroundColor = '#dbeafe';
                              } else {
                                e.target.style.backgroundColor = '#86efac';
                              }
                            }}
                            onMouseOut={(e) => {
                              if (!isAfternoonChecked) {
                                e.target.style.backgroundColor = '#f9fafb';
                              } else {
                                e.target.style.backgroundColor = '#bbf7d0';
                              }
                            }}
                          >
                            {isAfternoonChecked ? 'C' : ''}
                          </div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Légende */}
      <div style={styles.legend}>
        <h4 style={styles.legendTitle}>Légende</h4>
        
        {/* Légende des couleurs des jours */}
        <div style={styles.legendSection}>
          <h5 style={styles.legendSubtitle}>Types de jours :</h5>
          <div style={styles.legendGrid}>
            <div style={styles.legendItem}>
              <div style={{
                ...styles.legendExample,
                backgroundColor: '#3b82f6',
                color: 'white',
                fontWeight: 'bold',
                borderColor: '#3b82f6'
              }}>
                01
              </div>
              <span>Jour actuel</span>
            </div>
            
            <div style={styles.legendItem}>
              <div style={{
                ...styles.legendExample,
                backgroundColor: '#fecaca',
                color: '#991b1b',
                fontWeight: '600',
                borderColor: '#fca5a5'
              }}>
                01
              </div>
              <span>Jour férié</span>
            </div>
            
            <div style={styles.legendItem}>
              <div style={{
                ...styles.legendExample,
                backgroundColor: '#fed7aa',
                color: '#9a3412',
                borderColor: '#fb923c'
              }}>
                01
              </div>
              <span>Week-end</span>
            </div>
            
            <div style={styles.legendItem}>
              <div style={{
                ...styles.legendExample,
                backgroundColor: '#f3f4f6',
                color: '#374151',
                borderColor: '#e5e7eb'
              }}>
                01
              </div>
              <span>Jour normal</span>
            </div>
          </div>
        </div>

        {/* Légende des cases personnes */}
        <div style={styles.legendSection}>
          <h5 style={styles.legendSubtitle}>Planning des personnes :</h5>
          <div style={{display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14px'}}>
            <div style={styles.legendItem}>
              <div style={{
                width: '40px',
                height: '24px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                display: 'flex'
              }}>
                <div style={{
                  flex: 1,
                  backgroundColor: '#f9fafb',
                  borderRight: '1px solid #d1d5db',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px'
                }}>M</div>
                <div style={{
                  flex: 1,
                  backgroundColor: '#f9fafb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px'
                }}>A</div>
              </div>
              <span>M = Matinée, A = Après-midi</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{
                width: '40px',
                height: '24px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                display: 'flex'
              }}>
                <div style={{
                  flex: 1,
                  backgroundColor: '#bbf7d0',
                  borderRight: '1px solid #d1d5db',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: '#166534'
                }}>C</div>
                <div style={{
                  flex: 1,
                  backgroundColor: '#f9fafb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px'
                }}></div>
              </div>
              <span>C = Case cochée (cliquer pour cocher/décocher)</span>
            </div>
          </div>
        </div>
        
        <p style={{fontSize: '14px', color: '#6b7280'}}>
          Utilisez les boutons ou le champ de saisie pour changer d'année scolaire (septembre à août). 
          Survolez un jour ou une case pour voir plus d'informations.
          <strong> Cliquez sur une case M ou A pour cocher/décocher, ou maintenez le bouton enfoncé et glissez pour sélectionner plusieurs cases d'affilée sur la même ligne.</strong>
        </p>
      </div>
      </div>
    </div>
  );
};