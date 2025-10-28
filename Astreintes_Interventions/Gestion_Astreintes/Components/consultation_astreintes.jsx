const Component = () => {
  const [astreintes, setAstreintes] = useState([]);
  const [services, setServices] = useState([]);
  const [personnels, setPersonnels] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [joursSemaine, setJoursSemaine] = useState([]);
  const [joursFeries, setJoursFeries] = useState([]);
  const [servicesCliniques, setServicesCliniques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('mois');
  const [selectedServiceClinique, setSelectedServiceClinique] = useState('tous');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [
        astreintesData, 
        servicesData, 
        personnelsData, 
        utilisateursData,
        joursSemaineData,
        joursSeriesData,
        servicesCliniquesData
      ] = await Promise.all([
        gristAPI.getData('Astreintes'), 
        gristAPI.getData('Services'), 
        gristAPI.getData('Personnels'),
        gristAPI.getData('Utilisateurs'),
        gristAPI.getData('JoursSemaine'),
        gristAPI.getData('JoursFeries'),
        gristAPI.getData('ServicesCliniques')
      ]);
      
      setAstreintes(Array.isArray(astreintesData) ? astreintesData : []);
      setServices(Array.isArray(servicesData) ? servicesData : []);
      setPersonnels(Array.isArray(personnelsData) ? personnelsData : []);
      setUtilisateurs(Array.isArray(utilisateursData) ? utilisateursData : []);
      setJoursSemaine(Array.isArray(joursSemaineData) ? joursSemaineData : []);
      setJoursFeries(Array.isArray(joursSeriesData) ? joursSeriesData : []);
      setServicesCliniques(Array.isArray(servicesCliniquesData) ? servicesCliniquesData : []);

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
      setJoursSemaine([]);
      setJoursFeries([]);
      setServicesCliniques([]);
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

  const getAstreintesForDate = (date) => {
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
    const dateTimestamp = Math.floor(normalizedDate.getTime() / 1000);
    
    return astreintes.filter(a => {
      const astreinteFullDate = new Date(a.Date * 1000);
      const normalizedAstreinteDate = new Date(astreinteFullDate.getFullYear(), astreinteFullDate.getMonth(), astreinteFullDate.getDate(), 12, 0, 0);
      const astreinteTimestamp = Math.floor(normalizedAstreinteDate.getTime() / 1000);
      
      const diffInDays = Math.abs(dateTimestamp - astreinteTimestamp) / (24 * 60 * 60);
      return diffInDays < 1;
    });
  };

  const getServicesCliniques = () => {
    if (!services || services.length === 0) return [];
    
    const servicesCliniques = services
      .filter(service => service.gristHelper_Display2)
      .map(service => service.gristHelper_Display2)
      .filter((value, index, array) => array.indexOf(value) === index)
      .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
    
    return servicesCliniques;
  };

  const getAstreintesForCurrentView = () => {
    let filteredAstreintes = astreintes;
    
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
      const dayOfWeek = startOfWeek.getDay();
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startOfWeek.setDate(startOfWeek.getDate() - daysToSubtract);
    
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 7);
    
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
        const dayOfWeek = startOfWeek.getDay();
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
    const clinicien = personnels.find(p => p.id === clinicienId);
    return clinicien ? clinicien.Clinicien : 'Clinicien inconnu';
  };

  const isJourAstreinte = (astreinte) => astreinte.Type === '☀️ Jour';
  const isNuitAstreinte = (astreinte) => astreinte.Type === '🌙 Nuit';

  const renderYearView = () => {
    const year = currentDate.getFullYear(); 
    const months = [];
    
    for (let month = 0; month < 12; month++) {
      const monthDate = new Date(year, month, 1);
      const monthName = monthDate.toLocaleDateString('fr-FR', { month: 'long' });
      const monthAstreintes = astreintes.filter(a => {
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
	
	const dayOfWeek = firstDay.getDay();
	const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
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
                {dayAstreintes.slice(0, 3).map((astreinte, index) => (
                  <div 
                    key={index} 
                    style={{ 
                      background: isJourAstreinte(astreinte) ? '#dbeafe' : '#e0f2fe',
                      border: '1px solid #3b82f6',
                      color: isJourAstreinte(astreinte) ? '#1e40af' : '#0c4a6e', 
                      padding: '2px 4px', 
                      borderRadius: '3px', 
                      marginBottom: '2px', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap' 
                    }} 
                    title={`${getServiceName(astreinte.Service)} - ${getClinicienName(astreinte.Clinicien)}`}
                  >
                    {isJourAstreinte(astreinte) ? '☀️' : '🌙'} {getServiceName(astreinte.Service).substring(0, 8)}...
                  </div>
                ))}
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
    const dayOfWeek = startOfWeek.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
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
              return (
                <div 
                  key={index} 
                  style={{ 
                    background: isJourAstreinte(astreinte) ? '#dbeafe' : '#e0f2fe', 
                    padding: '8px', 
                    borderRadius: '6px', 
                    marginBottom: '8px', 
                    fontSize: '12px', 
                    position: 'relative',
                    border: '2px solid #3b82f6',
                    opacity: 1
                  }}
                >
                  <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                    {isJourAstreinte(astreinte) ? '☀️' : '🌙'} {getServiceName(astreinte.Service)}
                  </div>
                  <div style={{ color: '#6b7280' }}>
                    {getClinicienName(astreinte.Rem_Clinicien)}
                  </div>
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
        const dayOfWeek = startOfWeek.getDay();
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
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>👁️</div>
        <div>Chargement de la consultation des astreintes...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{
        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
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
          👁️ Consultation des astreintes
        </h1>
        <p style={{ fontSize: '1rem', opacity: '0.9' }}>
          Visualisation des astreintes planifiées
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
                  background: viewMode === mode ? '#6366f1' : 'transparent',
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

      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#1f2937' }}>Légende</h3>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '16px',
              height: '16px',
              background: '#dbeafe',
              borderRadius: '3px',
			  border: '2px solid #3b82f6'
            }}></div>
            <span style={{ fontSize: '14px' }}>☀️ Astreinte de jour</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '16px',
              height: '16px',
              background: '#e0f2fe',
              borderRadius: '3px',
			  border: '2px solid #3b82f6'
            }}></div>
            <span style={{ fontSize: '14px' }}>🌙 Astreinte de nuit</span>
          </div>

        </div>
      </div>

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
          <div style={{ fontSize: '32px', color: '#6366f1', fontWeight: 'bold', marginBottom: '5px' }}>
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
            {getAstreintesForCurrentView().filter(a => isJourAstreinte(a)).length}
          </div>
          <div style={{ color: '#6b7280' }}>Astreintes de jour</div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', color: '#8b5cf6', fontWeight: 'bold', marginBottom: '5px' }}>
            {getAstreintesForCurrentView().filter(a => isNuitAstreinte(a)).length}
          </div>
          <div style={{ color: '#6b7280' }}>Astreintes de nuit</div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', color: '#f59e0b', fontWeight: 'bold', marginBottom: '5px' }}>
            {selectedServiceClinique === 'tous' 
              ? new Set(getAstreintesForCurrentView().map(a => a.Service)).size
              : (getAstreintesForCurrentView().length > 0 ? services.filter(s => s.gristHelper_Display2 === selectedServiceClinique).length : 0)
            }
          </div>
          <div style={{ color: '#6b7280' }}>
            Service{(selectedServiceClinique === 'tous' ? new Set(getAstreintesForCurrentView().map(a => a.Service)).size : (getAstreintesForCurrentView().length > 0 ? services.filter(s => s.gristHelper_Display2 === selectedServiceClinique).length : 0)) > 1 ? 's' : ''} avec astreinte{(selectedServiceClinique === 'tous' ? new Set(getAstreintesForCurrentView().map(a => a.Service)).size : (getAstreintesForCurrentView().length > 0 ? services.filter(s => s.gristHelper_Display2 === selectedServiceClinique).length : 0)) > 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  );
};