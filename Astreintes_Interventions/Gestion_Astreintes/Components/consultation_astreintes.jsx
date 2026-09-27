const Component = () => {
  const [astreintes, setAstreintes] = useState([]);
  const [services, setServices] = useState([]);
  const [personnels, setPersonnels] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [servicesCliniques, setServicesCliniques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('mois');
  const [selectedServiceClinique, setSelectedServiceClinique] = useState('tous');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [astreintesData, servicesData, personnelsData, utilisateursData, scData] = await Promise.all([
        gristAPI.getData('Astreintes'),
        gristAPI.getData('TypesAstreintes'),
        gristAPI.getData('Personnels'),
        gristAPI.getData('Utilisateurs'),
        gristAPI.getData('ServicesCliniques')
      ]);
      setAstreintes(Array.isArray(astreintesData) ? astreintesData : []);
      setServices(Array.isArray(servicesData) ? servicesData : []);
      setPersonnels(Array.isArray(personnelsData) ? personnelsData : []);
      setUtilisateurs(Array.isArray(utilisateursData) ? utilisateursData : []);
      setServicesCliniques(Array.isArray(scData) ? scData : []);

      if (Array.isArray(utilisateursData) && utilisateursData.length > 0) {
        const scVal = utilisateursData[0].ServiceClinique;
        let scNoms = [];
        if (Array.isArray(scVal) && scVal[0] === 'L') scNoms = scVal.slice(1).filter(Boolean);
        else if (typeof scVal === 'string' && scVal.trim()) scNoms = [scVal.trim()];
        if (scNoms.length === 1) setSelectedServiceClinique(scNoms[0]);
      }
    } catch (e) {
      console.error('Erreur chargement:', e);
    } finally { setLoading(false); }
  };

  const sameDay = (date, timestamp) => {
    if (timestamp === null || timestamp === undefined || timestamp === '') return false;
    const b = new Date(timestamp * 1000);
    return date.getFullYear() === b.getFullYear()
        && date.getMonth()    === b.getMonth()
        && date.getDate()     === b.getDate();
  };

  const navigatePrevious = () => { const d = new Date(currentDate); if (viewMode === 'année') d.setFullYear(d.getFullYear() - 1); else if (viewMode === 'mois') d.setMonth(d.getMonth() - 1); else d.setDate(d.getDate() - 7); setCurrentDate(d); };
  const navigateNext = () => { const d = new Date(currentDate); if (viewMode === 'année') d.setFullYear(d.getFullYear() + 1); else if (viewMode === 'mois') d.setMonth(d.getMonth() + 1); else d.setDate(d.getDate() + 7); setCurrentDate(d); };
  const goToToday = () => setCurrentDate(new Date());

  const getStartOfWeek = (date) => { const d = new Date(date); d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1)); return d; };

  // Tous les NomService distincts présents dans les astreintes
  const getServicesCliniquesNoms = () =>
    [...new Set(astreintes.map(a => a.ServiceClinique).filter(Boolean))].sort();

  const filterBySC = (list) => selectedServiceClinique === 'tous' ? list : list.filter(a => a.ServiceClinique === selectedServiceClinique);

  const getAstreintesForDate = (date) => astreintes.filter(a => sameDay(date, a.Date));

  const getAstreintesView = () => {
    const y = currentDate.getFullYear(), m = currentDate.getMonth();
    let f = filterBySC(astreintes);
    if (viewMode === 'année') return f.filter(a => new Date(a.Date * 1000).getFullYear() === y);
    if (viewMode === 'mois') return f.filter(a => { const d = new Date(a.Date * 1000); return d.getFullYear() === y && d.getMonth() === m; });
    const sw = getStartOfWeek(currentDate), ew = new Date(sw); ew.setDate(ew.getDate() + 7);
    return f.filter(a => { const d = new Date(a.Date * 1000); return d >= sw && d <= ew; });
  };

  const getServiceName = (id) => { const s = services.find(s => s.id === id); return s ? s.TypeAstreinte : 'Inconnu'; };
  const getClinicienName = (id) => { if (!id || id === 0) return ''; const p = personnels.find(p => p.id === id); return p ? p.Clinicien : 'Inconnu'; };

  const isJour = (a) => a.Type === '☀️ Jour';
  const isNuit = (a) => a.Type === '🌙 Nuit';

  // Rem_Clinicien est l'id du clinicien effectif (calculé Grist)
  const getEffectiveClinicienName = (a) => getClinicienName(a.Rem_Clinicien);

  const getCurrentViewTitle = () => {
    if (viewMode === 'année') return currentDate.getFullYear();
    if (viewMode === 'mois') return currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const sw = getStartOfWeek(currentDate), ew = new Date(sw); ew.setDate(ew.getDate() + 6);
    return `${sw.getDate()} - ${ew.getDate()} ${ew.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
  };
  const getPeriodTitle = () => {
    if (viewMode === 'année') return `de l'année ${currentDate.getFullYear()}`;
    if (viewMode === 'mois') return `du mois de ${currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
    const sw = getStartOfWeek(currentDate), ew = new Date(sw); ew.setDate(ew.getDate() + 6);
    return `de la semaine du ${sw.getDate()} au ${ew.getDate()} ${ew.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
  };

  const renderYearView = () => {
    const y = currentDate.getFullYear();
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        {Array.from({ length: 12 }, (_, m) => {
          const md = new Date(y, m, 1);
          const count = filterBySC(astreintes).filter(a => { const d = new Date(a.Date * 1000); return d.getFullYear() === y && d.getMonth() === m; }).length;
          return (
            <div key={m} onClick={() => { setCurrentDate(md); setViewMode('mois'); }} style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', cursor: 'pointer', textAlign: 'center', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
              <h3 style={{ margin: '0 0 8px 0', color: '#1f2937', textTransform: 'capitalize', fontSize: '15px' }}>{md.toLocaleDateString('fr-FR', { month: 'long' })}</h3>
              <div style={{ fontSize: '22px', color: '#6366f1', fontWeight: 'bold' }}>{count}</div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>astreinte{count > 1 ? 's' : ''}</div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const y = currentDate.getFullYear(), mo = currentDate.getMonth();
    const first = new Date(y, mo, 1), start = new Date(first);
    start.setDate(start.getDate() - (first.getDay() === 0 ? 6 : first.getDay() - 1));
    const cur = new Date(start); const cells = [];
    for (let w = 0; w < 6; w++) for (let d = 0; d < 7; d++) {
      const day = new Date(cur); const inMonth = day.getMonth() === mo; const isToday = day.toDateString() === new Date().toDateString();
      const dayA = filterBySC(getAstreintesForDate(day));
      cells.push(
        <div key={`${w}-${d}`} onClick={() => inMonth && (setCurrentDate(day), setViewMode('semaine'))} style={{ minHeight: '90px', padding: '6px', border: '1px solid #e5e7eb', background: inMonth ? 'white' : '#f9fafb', cursor: inMonth ? 'pointer' : 'default', opacity: inMonth ? 1 : 0.5 }}>
          <div style={{ fontWeight: isToday ? 'bold' : 'normal', color: isToday ? '#6366f1' : inMonth ? '#1f2937' : '#9ca3af', marginBottom: '3px', fontSize: '13px' }}>{day.getDate()}</div>
          <div style={{ fontSize: '9px' }}>
            {dayA.slice(0, 3).map((a, i) => <div key={i} style={{ background: isJour(a) ? '#dbeafe' : '#e0f2fe', border: '1px solid #6366f1', color: isJour(a) ? '#1e40af' : '#0c4a6e', padding: '1px 3px', borderRadius: '3px', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{isJour(a) ? '☀️' : '🌙'} {getServiceName(a.TypeAstreinte).substring(0, 10)}</div>)}
            {dayA.length > 3 && <div style={{ color: '#6b7280' }}>+{dayA.length - 3}</div>}
          </div>
        </div>
      );
      cur.setDate(cur.getDate() + 1);
    }
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(h => <div key={h} style={{ padding: '10px 8px', textAlign: 'center', fontWeight: '600', fontSize: '13px', color: '#374151', background: '#f3f4f6', border: '1px solid #e5e7eb' }}>{h}</div>)}
        {cells}
      </div>
    );
  };

  const renderWeekView = () => {
    const sw = getStartOfWeek(currentDate);
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {Array.from({ length: 7 }, (_, i) => {
          const day = new Date(sw); day.setDate(day.getDate() + i);
          const isToday = day.toDateString() === new Date().toDateString();
          const dayA = filterBySC(getAstreintesForDate(day))
            .sort((a, b) => getServiceName(a.TypeAstreinte).localeCompare(getServiceName(b.TypeAstreinte), 'fr') || (isJour(a) ? -1 : 1));
          return (
            <div key={i}>
              <div style={{ padding: '12px', background: '#f3f4f6', textAlign: 'center', borderBottom: '1px solid #e5e7eb', fontWeight: isToday ? 'bold' : '500', color: isToday ? '#6366f1' : '#1f2937' }}>
                <div style={{ fontSize: '11px', marginBottom: '2px' }}>{day.toLocaleDateString('fr-FR', { weekday: 'short' })}</div>
                <div style={{ fontSize: '15px' }}>{day.getDate()}</div>
              </div>
              <div style={{ padding: '10px', minHeight: '280px', background: 'white' }}>
                {dayA.map((a, idx) => (
                  <div key={idx} style={{ background: isJour(a) ? '#dbeafe' : '#e0f2fe', padding: '6px 8px', borderRadius: '6px', marginBottom: '6px', fontSize: '11px', border: '2px solid #6366f1' }}>
                    <div style={{ fontWeight: '500', marginBottom: '2px' }}>{isJour(a) ? '☀️' : '🌙'} {getServiceName(a.TypeAstreinte)}</div>
                    <div style={{ color: '#6b7280' }}>{getEffectiveClinicienName(a)}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}><div style={{ fontSize: '48px', marginBottom: '20px' }}>👁️</div><div>Chargement...</div></div>;

  const viewAstr = getAstreintesView();

  return (
    <div style={{ padding: '2px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'white', padding: '10px', borderRadius: '12px', textAlign: 'center', marginBottom: '10px' }}>
        <h1 style={{ fontSize: '1.5rem', margin: '0 0 4px 0' }}>👁️ Consultation des astreintes</h1>
        <p style={{ fontSize: '1rem', margin: 0, opacity: 0.9 }}>Visualisation des astreintes planifiées</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={navigatePrevious} style={{ background: '#6b7280', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>←</button>
          <button onClick={goToToday} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}>Aujourd'hui</button>
          <button onClick={navigateNext} style={{ background: '#6b7280', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>→</button>
          <h2 style={{ margin: '0 0 0 10px', color: '#1f2937', textTransform: 'capitalize', fontSize: '16px' }}>{getCurrentViewTitle()}</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select value={selectedServiceClinique} onChange={e => setSelectedServiceClinique(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}>
            <option value="tous">Tous les services</option>
            {getServicesCliniquesNoms().map(sc => <option key={sc} value={sc}>{sc}</option>)}
          </select>
          <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: '6px', padding: '2px' }}>
            {['année', 'mois', 'semaine'].map(mode => <button key={mode} onClick={() => setViewMode(mode)} style={{ background: viewMode === mode ? '#6366f1' : 'transparent', color: viewMode === mode ? 'white' : '#374151', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', textTransform: 'capitalize' }}>{mode}</button>)}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        {viewMode === 'année' && renderYearView()}
        {viewMode === 'mois' && renderMonthView()}
        {viewMode === 'semaine' && renderWeekView()}
      </div>

      <div style={{ background: 'white', padding: '14px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '15px' }}>
        <h3 style={{ margin: '0 0 8px 0', color: '#1f2937', fontSize: '14px' }}>Légende</h3>
        <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '14px', height: '14px', background: '#dbeafe', borderRadius: '3px', border: '2px solid #6366f1' }}></div><span>☀️ Jour</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '14px', height: '14px', background: '#e0f2fe', borderRadius: '3px', border: '2px solid #6366f1' }}></div><span>🌙 Nuit</span></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        <div style={{ gridColumn: '1/-1', textAlign: 'center' }}><h3 style={{ color: '#1f2937', margin: '0 0 8px 0', fontSize: '15px' }}>Statistiques {getPeriodTitle()}</h3></div>
        {[
          { label: 'Total astreintes', value: viewAstr.length, color: '#6366f1' },
          { label: 'Astreintes de jour', value: viewAstr.filter(a => isJour(a)).length, color: '#10b981' },
          { label: 'Astreintes de nuit', value: viewAstr.filter(a => isNuit(a)).length, color: '#8b5cf6' },
          { label: 'Services concernés', value: new Set(viewAstr.map(a => a.TypeAstreinte)).size, color: '#f59e0b' }
        ].map(s => (
          <div key={s.label} style={{ background: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', textAlign: 'center' }}>
            <div style={{ fontSize: '26px', color: s.color, fontWeight: 'bold', marginBottom: '4px' }}>{s.value}</div>
            <div style={{ color: '#6b7280', fontSize: '12px' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
