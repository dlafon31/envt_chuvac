const Component = () => {
  const [astreintes, setAstreintes] = useState([]);
  const [services, setServices] = useState([]);
  const [personnels, setPersonnels] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('mois');
  const [selectedServiceClinique, setSelectedServiceClinique] = useState('tous');
  const [showSuiviModal, setShowSuiviModal] = useState(false);
  const [selectedAstreinte, setSelectedAstreinte] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [monthToValidate, setMonthToValidate] = useState({ year: 0, month: 0 });
  const [suiviFormData, setSuiviFormData] = useState({
    modifClinicien: '',
    nonRealise: false
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [astreintesData, servicesData, personnelsData, utilisateursData] = await Promise.all([
        gristAPI.getData('Astreintes'), 
        gristAPI.getData('Services'), 
        gristAPI.getData('Personnels'),
        gristAPI.getData('Utilisateurs')
      ]);
      setAstreintes(Array.isArray(astreintesData) ? astreintesData : []);
      setServices(Array.isArray(servicesData) ? servicesData : []);
      setPersonnels(Array.isArray(personnelsData) ? personnelsData : []);
      setUtilisateurs(Array.isArray(utilisateursData) ? utilisateursData : []);
	 
      // AUTO-SÉLECTION : Si un seul service clinique est disponible
      // Calculer les services cliniques disponibles après mise à jour des données
      if (Array.isArray(servicesData) && Array.isArray(utilisateursData) && utilisateursData.length > 0) {
        const premierUtilisateur = utilisateursData[0];
        let servicesAutorises = servicesData;
      
        if (premierUtilisateur.ServiceClinique && premierUtilisateur.ServiceClinique.trim() !== '') {
          const serviceCliniqueRecherche = premierUtilisateur.ServiceClinique.trim();
          servicesAutorises = servicesData.filter(service => service.gristHelper_Display2 === serviceCliniqueRecherche);
        }
      
        const servicesCliniques = servicesAutorises
          .filter(service => service.gristHelper_Display2)
          .map(service => service.gristHelper_Display2)
          .filter((value, index, array) => array.indexOf(value) === index);
      
        // Si un seul service clinique disponible, le sélectionner automatiquement
        if (servicesCliniques.length === 1) {
          setSelectedServiceClinique(servicesCliniques[0]);
        }
      }
	  
    } catch (error) {
      console.error('Erreur chargement données:', error);
      setAstreintes([]);
      setServices([]);
      setPersonnels([]);
      setUtilisateurs([]);
    } finally { 
      setLoading(false); 
    }
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('fr-FR');
  
  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'année') newDate.setFullYear(newDate.getFullYear() - 1);
    else if (viewMode === 'mois') newDate.setMonth(newDate.getMonth() - 1);
    else if (viewMode === 'semaine') newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'année') newDate.setFullYear(newDate.getFullYear() + 1);
    else if (viewMode === 'mois') newDate.setMonth(newDate.getMonth() + 1);
    else if (viewMode === 'semaine') newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToToday = () => setCurrentDate(new Date());

  const isResponsable = () => {
    if (!utilisateurs || utilisateurs.length === 0) return false;
    const premierUtilisateur = utilisateurs[0];
    return premierUtilisateur.Responsable === true;
  };

  const getServicesAutorises = () => {
    if (!services || services.length === 0) return [];
    if (!utilisateurs || utilisateurs.length === 0) return services;
    
    const premierUtilisateur = utilisateurs[0];
    if (!premierUtilisateur.ServiceClinique || premierUtilisateur.ServiceClinique.trim() === '') {
      return services;
    }
    
    const serviceCliniqueRecherche = premierUtilisateur.ServiceClinique.trim();
    return services.filter(service => service.gristHelper_Display2 === serviceCliniqueRecherche);
  };

  const getAstreintesForDate = (date) => {
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
    const dateTimestamp = Math.floor(normalizedDate.getTime() / 1000);
    
    // Filtrer d'abord par services autorisés
    const servicesAutorises = getServicesAutorises();
    const servicesAutoriseIds = servicesAutorises.map(s => s.id);
    
    return astreintes.filter(a => {
      // Vérifier si le service est autorisé
      if (!servicesAutoriseIds.includes(a.Service)) return false;
      
      // Vérifier la date
      const astreinteFullDate = new Date(a.Date * 1000);
      const normalizedAstreinteDate = new Date(astreinteFullDate.getFullYear(), astreinteFullDate.getMonth(), astreinteFullDate.getDate(), 12, 0, 0);
      const astreinteTimestamp = Math.floor(normalizedAstreinteDate.getTime() / 1000);
      
      const diffInDays = Math.abs(dateTimestamp - astreinteTimestamp) / (24 * 60 * 60);
      return diffInDays < 1;
    });
  };

  const getServicesCliniques = () => {
    const servicesAutorises = getServicesAutorises();
    if (!servicesAutorises || servicesAutorises.length === 0) return [];
    
    const servicesCliniques = servicesAutorises
      .filter(service => service.gristHelper_Display2)
      .map(service => service.gristHelper_Display2)
      .filter((value, index, array) => array.indexOf(value) === index)
      .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
    
    return servicesCliniques;
  };

  const getAstreintesForCurrentView = () => {

    // Commencer par les services autorisés
    const servicesAutorises = getServicesAutorises();
    const servicesAutoriseIds = servicesAutorises.map(s => s.id);
    
    let filteredAstreintes = astreintes.filter(a => servicesAutoriseIds.includes(a.Service));
    
    if (selectedServiceClinique !== 'tous') {
      filteredAstreintes = filteredAstreintes.filter(astreinte => {
        const service = services.find(s => s.id === astreinte.Service);
        return service && service.gristHelper_Display2 === selectedServiceClinique;
      });
    }
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    if (viewMode === 'année') {
      filteredAstreintes = filteredAstreintes.filter(a => {
        const aDate = new Date(a.Date * 1000);
        return aDate.getFullYear() === year;
      });
    } else if (viewMode === 'mois') {
      filteredAstreintes = filteredAstreintes.filter(a => {
        const aDate = new Date(a.Date * 1000);
        return aDate.getFullYear() === year && aDate.getMonth() === month;
      });
    } else if (viewMode === 'semaine') {
      const startOfWeek = new Date(currentDate);
      // CORRECTION : Gérer correctement le cas où currentDate est un dimanche
      const dayOfWeek = startOfWeek.getDay(); // 0 = dimanche, 1 = lundi, etc.
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startOfWeek.setDate(startOfWeek.getDate() - daysToSubtract);
    
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 7); // +7 pour avoir le dernier jour
    
      filteredAstreintes = filteredAstreintes.filter(a => {
        const aDate = new Date(a.Date * 1000);
        return aDate >= startOfWeek && aDate <= endOfWeek;
      });
    }
  
    return filteredAstreintes;
  };

  const getFilteredAstreintes = (dateAstreintes) => {
    if (selectedServiceClinique === 'tous') return dateAstreintes;
    
    return dateAstreintes.filter(astreinte => {
      const service = services.find(s => s.id === astreinte.Service);
      return service && service.gristHelper_Display2 === selectedServiceClinique;
    });
  };
  
  const getPeriodTitle = () => {
    switch (viewMode) {
      case 'année':
        return `de l'année ${currentDate.getFullYear()}`;
      case 'mois':
        return `du mois de ${currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
      case 'semaine':
        const startOfWeek = new Date(currentDate);
        // CORRECTION : Gérer correctement le cas où currentDate est un dimanche
        const dayOfWeek = startOfWeek.getDay(); // 0 = dimanche, 1 = lundi, etc.
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startOfWeek.setDate(startOfWeek.getDate() - daysToSubtract);
      
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        return `de la semaine du ${startOfWeek.getDate()} au ${endOfWeek.getDate()} ${endOfWeek.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
      default:
        return '';
    }
  };

  const getServiceName = (serviceId) => {
    const service = services.find(s => s.id === serviceId);
    return service ? service.Denomination : 'Service inconnu';
  };

  const getClinicienName = (clinicienId) => {
    if (!clinicienId || clinicienId === 0) return 'Clinicien inconnu';
    const clinicien = personnels.find(p => p.id === clinicienId);
    return clinicien ? clinicien.Clinicien : 'Clinicien inconnu';
  };

  const getCliniciensByService = (serviceId) => {
    if (!serviceId) return [];
    
    const selectedService = services.find(s => s.id === parseInt(serviceId));
    if (!selectedService || !selectedService.ServiceClinique) return [];
    
    return personnels.filter(p => p.ServiceClinique === selectedService.ServiceClinique);
  };

  const isJourAstreinte = (astreinte) => astreinte.Type === '☀️ Jour';
  const isNuitAstreinte = (astreinte) => astreinte.Type === '🌙 Nuit';

  // Afficher le clinicien modifié ou le clinicien original
  const getEffectiveClinicien = (astreinte) => {
    // Utiliser la colonne booléenne Clinicien_Modif pour déterminer s'il faut afficher le clinicien modifié
    if (astreinte.Clinicien_Modif === true) {
      return getClinicienName(astreinte.Modif_Clinicien);
    }
    // Sinon utiliser le clinicien original
    return getClinicienName(astreinte.Clinicien);
  };

  const handleAstreinteClick = (astreinte) => {
    if (!isResponsable()) return;
    
    setSelectedAstreinte(astreinte);
    setSuiviFormData({
      modifClinicien: astreinte.Modif_Clinicien || '',
      nonRealise: astreinte.NonRealise || false
    });
    setShowSuiviModal(true);
  };

  const handleSaveSuivi = async () => {
    if (!selectedAstreinte) return;

    try {
      await gristAPI.updateRecord('Astreintes', selectedAstreinte.id, {
        Modif_Clinicien: suiviFormData.modifClinicien ? parseInt(suiviFormData.modifClinicien) : null,
        NonRealise: suiviFormData.nonRealise
      });

      setShowSuiviModal(false);
      setSuiviFormData({ modifClinicien: '', nonRealise: false });
      setSelectedAstreinte(null);
      await loadData();
    } catch (error) {
      alert('Erreur lors de la sauvegarde: ' + error.message);
    }
  };

  const isMonthPast = (year, month) => {
    const monthDate = new Date(year, month + 1, 0); // Dernier jour du mois
    const today = new Date();
    return monthDate < today;
  };

  const hasUnvalidatedAstreintes = (year, month) => {
    const servicesAutorises = getServicesAutorises();
    const servicesAutoriseIds = servicesAutorises.map(s => s.id);
    
    return astreintes.some(a => {
      if (!servicesAutoriseIds.includes(a.Service)) return false;
      if (a.ValidationService) return false;
      
      // Filtrer également par service clinique sélectionné
      if (selectedServiceClinique !== 'tous') {
        const service = services.find(s => s.id === a.Service);
        if (!service || service.gristHelper_Display2 !== selectedServiceClinique) return false;
      }
      
      const aDate = new Date(a.Date * 1000);
      return aDate.getFullYear() === year && aDate.getMonth() === month;
    });
  };

  const handleValidateMonth = async (year, month) => {
    setMonthToValidate({ year, month });
    setShowConfirmModal(true);
  };

  const confirmValidateMonth = async () => {
    try {
      const { year, month } = monthToValidate;
      const servicesAutorises = getServicesAutorises();
      const servicesAutoriseIds = servicesAutorises.map(s => s.id);
      
      const astreintesToValidate = astreintes.filter(a => {
        if (!servicesAutoriseIds.includes(a.Service)) return false;
        if (a.ValidationService) return false;
        
        // Filtrer également par service clinique sélectionné
        if (selectedServiceClinique !== 'tous') {
          const service = services.find(s => s.id === a.Service);
          if (!service || service.gristHelper_Display2 !== selectedServiceClinique) return false;
        }
        
        const aDate = new Date(a.Date * 1000);
        return aDate.getFullYear() === year && aDate.getMonth() === month;
      });

      for (const astreinte of astreintesToValidate) {
        await gristAPI.updateRecord('Astreintes', astreinte.id, {
          ValidationService: true
        });
      }

      setShowConfirmModal(false);
      await loadData();
    } catch (error) {
      alert('Erreur lors de la validation: ' + error.message);
    }
  };

  const renderYearView = () => {
    const year = currentDate.getFullYear(); 
    const months = [];
    
    for (let month = 0; month < 12; month++) {
      const monthDate = new Date(year, month, 1);
      const monthName = monthDate.toLocaleDateString('fr-FR', { month: 'long' });
      const servicesAutorises = getServicesAutorises();
      const servicesAutoriseIds = servicesAutorises.map(s => s.id);
      
      const monthAstreintes = astreintes.filter(a => {
        if (!servicesAutoriseIds.includes(a.Service)) return false;
        
        const aDate = new Date(a.Date * 1000);
        const matchesDate = aDate.getFullYear() === year && aDate.getMonth() === month;
        
        if (!matchesDate) return false;
        
        if (selectedServiceClinique === 'tous') return true;
        
        const service = services.find(s => s.id === a.Service);
        return service && service.gristHelper_Display2 === selectedServiceClinique;
      });
      
      months.push(
        <div 
          key={month} 
          onClick={() => { setCurrentDate(monthDate); setViewMode('mois'); }} 
          style={{ 
            background: 'white', 
            padding: '20px', 
            borderRadius: '8px', 
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)', 
            cursor: 'pointer', 
            transition: 'transform 0.2s, box-shadow 0.2s', 
            textAlign: 'center' 
          }} 
          onMouseEnter={(e) => { 
            e.currentTarget.style.transform = 'translateY(-2px)'; 
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)'; 
          }} 
          onMouseLeave={(e) => { 
            e.currentTarget.style.transform = 'translateY(0)'; 
            e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)'; 
          }}
        >
          <h3 style={{ margin: '0 0 10px 0', color: '#1f2937', textTransform: 'capitalize' }}>
            {monthName}
          </h3>
          <div style={{ fontSize: '24px', color: '#3b82f6', fontWeight: 'bold', marginBottom: '5px' }}>
            {monthAstreintes.length}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            astreinte{monthAstreintes.length > 1 ? 's' : ''}
          </div>
        </div>
      );
    }
    
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        {months}
      </div>
    );
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear(); 
    const month = currentDate.getMonth(); 
    const firstDay = new Date(year, month, 1); 
    const startDate = new Date(firstDay);
    
	// startDate.setDate(startDate.getDate() - firstDay.getDay() + 1);
	// CORRECTION : Gérer correctement le cas où le premier jour du mois est un dimanche
	const dayOfWeek = firstDay.getDay(); // 0 = dimanche, 1 = lundi, etc.
	const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Si dimanche (0), reculer de 6 jours, sinon reculer de (dayOfWeek - 1) jours
	startDate.setDate(startDate.getDate() - daysToSubtract);
    
    const days = []; 
    const currentDay = new Date(startDate); 
    const dayHeaders = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    
    for (let week = 0; week < 6; week++) {
      for (let day = 0; day < 7; day++) {
        const dayDate = new Date(currentDay); 
        const isCurrentMonth = dayDate.getMonth() === month; 
        const isToday = dayDate.toDateString() === new Date().toDateString(); 
        const dayAstreintes = getFilteredAstreintes(getAstreintesForDate(dayDate));
        
        days.push(
          <div 
            key={`${week}-${day}`} 
            onClick={() => {
              if (isCurrentMonth) {
                setCurrentDate(dayDate);
                setViewMode('semaine');
              }
            }}
            style={{ 
              minHeight: '100px', 
              padding: '8px', 
              border: '1px solid #e5e7eb', 
              background: isCurrentMonth ? 'white' : '#f9fafb', 
              cursor: isCurrentMonth ? 'pointer' : 'default', 
              position: 'relative', 
              opacity: isCurrentMonth ? 1 : 0.5 
            }}
          >
            <div style={{ 
              fontWeight: isToday ? 'bold' : 'normal', 
              color: isToday ? '#3b82f6' : isCurrentMonth ? '#1f2937' : '#9ca3af', 
              marginBottom: '4px', 
              fontSize: '14px' 
            }}>
              {dayDate.getDate()}
            </div>
            {dayAstreintes.length > 0 && (
              <div style={{ fontSize: '10px' }}>
                {dayAstreintes.slice(0, 3).map((astreinte, index) => {
                  // Déterminer la couleur de bordure et de fond selon le statut
                  let borderColor = '#3b82f6'; // Bleu par défaut (non validée)
                  let backgroundColor = isJourAstreinte(astreinte) ? '#dbeafe' : '#e0f2fe'; // Bleu clair par défaut
                  
                  if (astreinte.ValidationService) {
                    borderColor = '#10b981'; // Vert si validée
                    backgroundColor = '#d1fae5'; // Fond vert clair
                  } else if (astreinte.NonRealise) {
                    borderColor = '#ef4444'; // Rouge si non réalisée
                    backgroundColor = '#fee2e2'; // Fond rouge clair
                  } else if (astreinte.Clinicien_Modif) {
                    borderColor = '#f59e0b'; // Orange si modifiée
                    backgroundColor = '#fef3c7'; // Fond orange clair
                  }
                  
                  return (
                    <div 
                      key={index} 
                      style={{ 
                        background: backgroundColor,
                        color: isJourAstreinte(astreinte) ? '#1e40af' : '#0c4a6e', 
                        padding: '2px 4px', 
                        borderRadius: '3px', 
                        marginBottom: '2px', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap',
                        border: `1px solid ${borderColor}`
                      }} 
                      title={`${getServiceName(astreinte.Service)} - ${getEffectiveClinicien(astreinte)}`}
                    >
                      {isJourAstreinte(astreinte) ? '☀️' : '🌙'} {getServiceName(astreinte.Service).substring(0, 8)}...
                    </div>
                  );
                })}
                {dayAstreintes.length > 3 && (
                  <div style={{ color: '#6b7280', fontSize: '9px' }}>
                    +{dayAstreintes.length - 3} autre{dayAstreintes.length - 3 > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            )}
          </div>
        );
        
        currentDay.setDate(currentDay.getDate() + 1);
      }
    }
    
    return (
      <div>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)', 
          background: '#f3f4f6', 
          border: '1px solid #e5e7eb' 
        }}>
          {dayHeaders.map(day => (
            <div 
              key={day} 
              style={{ 
                padding: '12px 8px', 
                textAlign: 'center', 
                fontWeight: '600', 
                fontSize: '14px', 
                color: '#374151' 
              }}
            >
              {day}
            </div>
          ))}
        </div>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)', 
          background: 'white', 
          border: '1px solid #e5e7eb', 
          borderTop: 'none' 
        }}>
          {days}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
	
    // CORRECTION : Gérer correctement le cas où currentDate est un dimanche
    const dayOfWeek = startOfWeek.getDay(); // 0 = dimanche, 1 = lundi, etc.
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Si dimanche (0), reculer de 6 jours, sinon reculer de (dayOfWeek - 1) jours
    startOfWeek.setDate(startOfWeek.getDate() - daysToSubtract);
  
    const days = [];
  
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(startOfWeek); 
      dayDate.setDate(dayDate.getDate() + i); 
      const isToday = dayDate.toDateString() === new Date().toDateString(); 
	  const dayAstreintes = getFilteredAstreintes(getAstreintesForDate(dayDate));
      
      const sortedAstreintes = dayAstreintes.sort((a, b) => {
        const serviceA = getServiceName(a.Service);
        const serviceB = getServiceName(b.Service);
        
        const serviceCompare = serviceA.localeCompare(serviceB, 'fr', { sensitivity: 'base' });
        if (serviceCompare !== 0) return serviceCompare;
        
        const typeA = isJourAstreinte(a) ? 0 : 1;
        const typeB = isJourAstreinte(b) ? 0 : 1;
        return typeA - typeB;
      });
      
      days.push(
        <div key={i} style={{ flex: 1 }}>
          <div style={{ 
            padding: '15px', 
            background: '#f3f4f6', 
            textAlign: 'center', 
            borderBottom: '1px solid #e5e7eb', 
            fontWeight: isToday ? 'bold' : '500', 
            color: isToday ? '#3b82f6' : '#1f2937' 
          }}>
            <div style={{ fontSize: '12px', marginBottom: '2px' }}>
              {dayDate.toLocaleDateString('fr-FR', { weekday: 'short' })}
            </div>
            <div style={{ fontSize: '16px' }}>{dayDate.getDate()}</div>
          </div>
          <div style={{ padding: '15px', minHeight: '300px', background: 'white' }}>
            {sortedAstreintes.map((astreinte, index) => {
              // Déterminer la couleur de bordure et de fond selon le statut
              let borderColor = '#3b82f6'; // Bleu par défaut (non validée)
              let backgroundColor = isJourAstreinte(astreinte) ? '#dbeafe' : '#e0f2fe'; // Bleu clair par défaut
              
              if (astreinte.ValidationService) {
                borderColor = '#10b981'; // Vert si validée
                backgroundColor = '#d1fae5'; // Fond vert clair
              } else if (astreinte.NonRealise) {
                borderColor = '#ef4444'; // Rouge si non réalisée
                backgroundColor = '#fee2e2'; // Fond rouge clair
              } else if (astreinte.Clinicien_Modif) {
                borderColor = '#f59e0b'; // Orange si modifiée
                backgroundColor = '#fef3c7'; // Fond orange clair
              }
              
              return (
                <div 
                  key={index} 
                  onClick={() => handleAstreinteClick(astreinte)}
                  style={{ 
                    background: backgroundColor, 
                    padding: '8px', 
                    borderRadius: '6px', 
                    marginBottom: '8px', 
                    fontSize: '12px', 
                    cursor: isResponsable() ? 'pointer' : 'default',
                    opacity: astreinte.ValidationService ? 0.7 : 1,
                    border: `2px solid ${borderColor}`
                  }}
                >
                  <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                    {isJourAstreinte(astreinte) ? '☀️' : '🌙'} {getServiceName(astreinte.Service)}
                    {astreinte.ValidationService && <span style={{ color: '#10b981', marginLeft: '5px' }}>✓</span>}
                  </div>
                  <div style={{ color: '#6b7280', marginBottom: '4px' }}>
                    {getEffectiveClinicien(astreinte)}
                    {astreinte.Clinicien_Modif && (
                      <span style={{ color: '#f59e0b', fontSize: '10px' }}> (modifié)</span>
                    )}
                  </div>
                  {astreinte.NonRealise && (
                    <div style={{ color: '#ef4444', fontSize: '10px', fontWeight: '500' }}>
                      Non réalisé
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    
    return (
      <div style={{ 
        display: 'flex', 
        background: 'white', 
        borderRadius: '8px', 
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)', 
        overflow: 'hidden' 
      }}>
        {days}
      </div>
    );
  };

  const getCurrentViewTitle = () => {
    switch (viewMode) {
      case 'année':
        return currentDate.getFullYear();
      case 'mois':
        return currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      case 'semaine':
        const startOfWeek = new Date(currentDate); 
        // CORRECTION : Gérer correctement le cas où currentDate est un dimanche
        const dayOfWeek = startOfWeek.getDay(); // 0 = dimanche, 1 = lundi, etc.
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startOfWeek.setDate(startOfWeek.getDate() - daysToSubtract);
      
        const endOfWeek = new Date(startOfWeek); 
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        return `${startOfWeek.getDate()} - ${endOfWeek.getDate()} ${endOfWeek.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
      default:
        return '';
  }
};

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>📋</div>
        <div>Chargement du suivi des astreintes...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: 'white',
        padding: '2px',
        borderRadius: '12px',
        textAlign: 'center',
        marginBottom: '10px'
      }}>
        <h1 style={{ 
          fontSize: '1.5rem', 
          marginBottom: '1px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '2px' 
        }}>
          📋 Suivi des astreintes
        </h1>
        <p style={{ fontSize: '1rem', opacity: '0.9' }}>
          Suivi et validation des astreintes réalisées par service
        </p>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            onClick={navigatePrevious} 
            style={{
              background: '#6b7280',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            ←
          </button>
          
          <button 
            onClick={goToToday} 
            style={{
              background: '#10b981',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Aujourd'hui
          </button>
          
          <button 
            onClick={navigateNext} 
            style={{
              background: '#6b7280',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            →
          </button>
          
          <h2 style={{ margin: '0 0 0 15px', color: '#1f2937', textTransform: 'capitalize' }}>
            {getCurrentViewTitle()}
          </h2>
        </div>

        {/* Bouton de validation centré - toujours visible */}
        {viewMode === 'mois' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button
              onClick={() => {
                if (isResponsable() && isMonthPast(currentDate.getFullYear(), currentDate.getMonth()) && hasUnvalidatedAstreintes(currentDate.getFullYear(), currentDate.getMonth())) {
                  handleValidateMonth(currentDate.getFullYear(), currentDate.getMonth());
                }
              }}
              disabled={!isResponsable() || !isMonthPast(currentDate.getFullYear(), currentDate.getMonth()) || !hasUnvalidatedAstreintes(currentDate.getFullYear(), currentDate.getMonth())}
              style={{
                background: (isResponsable() && isMonthPast(currentDate.getFullYear(), currentDate.getMonth()) && hasUnvalidatedAstreintes(currentDate.getFullYear(), currentDate.getMonth())) 
                  ? '#059669' 
                  : '#d1d5db',
                color: (isResponsable() && isMonthPast(currentDate.getFullYear(), currentDate.getMonth()) && hasUnvalidatedAstreintes(currentDate.getFullYear(), currentDate.getMonth())) 
                  ? 'white' 
                  : '#9ca3af',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: (isResponsable() && isMonthPast(currentDate.getFullYear(), currentDate.getMonth()) && hasUnvalidatedAstreintes(currentDate.getFullYear(), currentDate.getMonth())) 
                  ? 'pointer' 
                  : 'not-allowed',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                height: '34px',
                whiteSpace: 'nowrap',
                opacity: (isResponsable() && isMonthPast(currentDate.getFullYear(), currentDate.getMonth()) && hasUnvalidatedAstreintes(currentDate.getFullYear(), currentDate.getMonth())) 
                  ? 1 
                  : 0.6,
                transition: 'all 0.2s ease'
              }}
            >
              ✓ Valider les astreintes du mois
            </button>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <select
            value={selectedServiceClinique}
            onChange={(e) => setSelectedServiceClinique(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="tous">Tous les services cliniques</option>
            {getServicesCliniques().map(serviceClinique => (
              <option key={serviceClinique} value={serviceClinique}>
                {serviceClinique}
              </option>
            ))}
          </select>

          <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: '6px', padding: '2px' }}>
            {['année', 'mois', 'semaine'].map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  background: viewMode === mode ? '#10b981' : 'transparent',
                  color: viewMode === mode ? 'white' : '#374151',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        {viewMode === 'année' && renderYearView()}
        {viewMode === 'mois' && renderMonthView()}
        {viewMode === 'semaine' && renderWeekView()}
      </div>

      {/* Modal de confirmation de validation */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            maxWidth: '400px',
            width: '90%',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              background: '#059669',
              color: 'white',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>✓</div>
              <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                Validation des astreintes
              </h4>
            </div>
            
            {/* Body */}
            <div style={{ padding: '30px 25px', textAlign: 'center' }}>
              <p style={{ 
                margin: '0 0 25px 0', 
                color: '#374151',
                fontSize: '16px',
                lineHeight: '1.5'
              }}>
                Confirmez-vous la validation des astreintes 
                {selectedServiceClinique !== 'tous' && (
                  <span> du service <strong>{selectedServiceClinique}</strong></span>
                )} du mois de{' '}
                <strong>
                  {new Date(monthToValidate.year, monthToValidate.month).toLocaleDateString('fr-FR', { 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </strong> ?
              </p>
              <p style={{
                margin: 0,
                color: '#6b7280',
                fontSize: '14px'
              }}>
                Cette action ne pourra pas être annulée.
              </p>
            </div>
            
            {/* Footer */}
            <div style={{
              background: '#f9fafb',
              padding: '20px 25px',
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowConfirmModal(false)}
                style={{
                  background: 'white',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'white';
                }}
              >
                Annuler
              </button>
              
              <button
                onClick={confirmValidateMonth}
                style={{
                  background: '#059669',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#047857';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#059669';
                }}
              >
                ✓ Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de suivi des astreintes */}
      {showSuiviModal && selectedAstreinte && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '12px',
            minWidth: '600px',
            maxWidth: '90vw'
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#1f2937' }}>
              Suivi Astreinte - {formatDate(new Date(selectedAstreinte.Date * 1000))}
            </h3>

            {/* Informations de l'astreinte (non modifiables) */}
            <div style={{ background: '#f9fafb', padding: '15px', borderRadius: '6px', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#374151' }}>Informations de l'astreinte</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#6b7280' }}>
                    Service
                  </label>
                  <div style={{ padding: '8px', background: 'white', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                    {getServiceName(selectedAstreinte.Service)}
                  </div>
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#6b7280' }}>
                    Type
                  </label>
                  <div style={{ padding: '8px', background: 'white', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                    {isJourAstreinte(selectedAstreinte) ? '☀️ Jour' : '🌙 Nuit'}
                  </div>
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#6b7280' }}>
                  Clinicien prévu
                </label>
                <div style={{ padding: '8px', background: 'white', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                  {getClinicienName(selectedAstreinte.Clinicien)}
                </div>
              </div>
            </div>

            {/* Champs modifiables (si pas validé) */}
            {!selectedAstreinte.ValidationService ? (
              <div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Modification du clinicien
                  </label>
                  <select
                    value={suiviFormData.modifClinicien}
                    onChange={(e) => setSuiviFormData({...suiviFormData, modifClinicien: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="">Aucun changement</option>
                    {getCliniciensByService(selectedAstreinte.Service).map(clinicien => (
                      <option key={clinicien.id} value={clinicien.id}>
                        {clinicien.Clinicien}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={suiviFormData.nonRealise}
                      onChange={(e) => setSuiviFormData({...suiviFormData, nonRealise: e.target.checked})}
                      style={{ marginRight: '8px' }}
                    />
                    <span style={{ fontWeight: '500' }}>Astreinte non réalisée</span>
                  </label>
                </div>
              </div>
            ) : (
              <div style={{ background: '#fef3c7', padding: '15px', borderRadius: '6px', marginBottom: '20px' }}>
                <div style={{ color: '#d97706', fontWeight: '500', marginBottom: '10px' }}>
                  ⚠️ Astreinte validée - Consultation uniquement
                </div>
                <div>
                  <strong>Clinicien effectif:</strong> {getEffectiveClinicien(selectedAstreinte)}
                  {selectedAstreinte.Modif_Clinicien && <span style={{ color: '#f59e0b' }}> (modifié)</span>}
                </div>
                {selectedAstreinte.NonRealise && (
                  <div style={{ color: '#ef4444', fontWeight: '500', marginTop: '5px' }}>
                    ❌ Astreinte non réalisée
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowSuiviModal(false);
                  setSuiviFormData({ modifClinicien: '', nonRealise: false });
                  setSelectedAstreinte(null);
                }}
                style={{
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                {selectedAstreinte.ValidationService ? 'Fermer' : 'Annuler'}
              </button>

              {!selectedAstreinte.ValidationService && (
                <button
                  onClick={handleSaveSuivi}
                  style={{
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Sauvegarder
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Légende */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#1f2937' }}>Légende</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '16px',
              height: '16px',
              background: '#dbeafe',
              borderRadius: '3px',
              border: '2px solid #3b82f6'
            }}></div>
            <span style={{ fontSize: '14px' }}>Astreinte non validée</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '16px',
              height: '16px',
              background: '#d1fae5',
              borderRadius: '3px',
              border: '2px solid #10b981'
            }}></div>
            <span style={{ fontSize: '14px' }}>Astreinte validée</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '16px',
              height: '16px',
              background: '#fef3c7',
              borderRadius: '3px',
              border: '2px solid #f59e0b'
            }}></div>
            <span style={{ fontSize: '14px' }}>Clinicien modifié</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '16px',
              height: '16px',
              background: '#fee2e2',
              borderRadius: '3px',
              border: '2px solid #ef4444'
            }}></div>
            <span style={{ fontSize: '14px' }}>Astreinte non réalisée</span>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div style={{
        marginTop: '30px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px'
      }}>
        <div style={{
          gridColumn: '1 / -1',
          textAlign: 'center',
          marginBottom: '10px'
        }}>
          <h3 style={{ color: '#1f2937', margin: '0' }}>
            Statistiques {getPeriodTitle()}
            {selectedServiceClinique !== 'tous' && 
              ` - ${selectedServiceClinique}`}
          </h3>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', color: '#3b82f6', fontWeight: 'bold', marginBottom: '5px' }}>
            {getAstreintesForCurrentView().length}
          </div>
          <div style={{ color: '#6b7280' }}>Total astreintes</div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', color: '#10b981', fontWeight: 'bold', marginBottom: '5px' }}>
            {getAstreintesForCurrentView().filter(a => a.ValidationService).length}
          </div>
          <div style={{ color: '#6b7280' }}>Astreintes validées</div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', color: '#f59e0b', fontWeight: 'bold', marginBottom: '5px' }}>
            {getAstreintesForCurrentView().filter(a => a.Clinicien_Modif).length}
          </div>
          <div style={{ color: '#6b7280' }}>Cliniciens modifiés</div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', color: '#ef4444', fontWeight: 'bold', marginBottom: '5px' }}>
            {getAstreintesForCurrentView().filter(a => a.NonRealise).length}
          </div>
          <div style={{ color: '#6b7280' }}>Non réalisées</div>
        </div>
      </div>
    </div>
  );
};