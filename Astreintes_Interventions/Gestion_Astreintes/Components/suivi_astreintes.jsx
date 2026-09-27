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
  const [showSuiviModal, setShowSuiviModal] = useState(false);
  const [selectedAstreinte, setSelectedAstreinte] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [monthToValidate, setMonthToValidate] = useState({ year: 0, month: 0 });
  const [suiviFormData, setSuiviFormData] = useState({ modifClinicien: '', nonRealise: false });

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
        const u = utilisateursData[0];
        const scVal = u.ServiceClinique;
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

  const isResponsable = () => utilisateurs.length > 0 && utilisateurs[0].Responsable === true;

  const getUserScNoms = () => {
    if (utilisateurs.length === 0) return null;
    const scVal = utilisateurs[0].ServiceClinique;
    if (Array.isArray(scVal) && scVal[0] === 'L') { const n = scVal.slice(1).filter(Boolean); return n.length > 0 ? n : null; }
    if (typeof scVal === 'string' && scVal.trim()) return [scVal.trim()];
    return null;
  };

  const getServicesAutorises = () => {
    const scAuto = getUserScNoms();
    if (!scAuto) return services;
    return services.filter(s => { const sc = servicesCliniques.find(sc => sc.id === s.ServiceClinique); return sc && scAuto.includes(sc.NomService); });
  };

  const getServicesCliниquesNoms = () => {
    return [...new Set(getServicesAutorises().map(s => { const sc = servicesCliniques.find(sc => sc.id === s.ServiceClinique); return sc ? sc.NomService : ''; }).filter(Boolean))].sort();
  };

  const getAstreintesForDate = (date) => {
    const svcsIds = getServicesAutorises().map(s => s.id);
    return astreintes.filter(a => svcsIds.includes(a.TypeAstreinte) && sameDay(date, a.Date));
  };

  const filterBySC = (list) => {
    if (selectedServiceClinique === 'tous') return list;
    return list.filter(a => a.ServiceClinique === selectedServiceClinique);
  };

  const filterByUserAndPeriod = (list) => {
    const scAuto = getUserScNoms();
    let f = scAuto ? list.filter(a => scAuto.includes(a.ServiceClinique)) : list;
    const y = currentDate.getFullYear(), m = currentDate.getMonth();
    if (viewMode === 'année') return f.filter(a => new Date(a.Date * 1000).getFullYear() === y);
    if (viewMode === 'mois') return f.filter(a => { const d = new Date(a.Date * 1000); return d.getFullYear() === y && d.getMonth() === m; });
    const sw = getStartOfWeek(currentDate), ew = new Date(sw); ew.setDate(ew.getDate() + 7);
    return f.filter(a => { const d = new Date(a.Date * 1000); return d >= sw && d <= ew; });
  };

  const getAstreintesView = () => filterBySC(filterByUserAndPeriod(astreintes));

  const getServiceName = (id) => { const s = services.find(s => s.id === id); return s ? s.TypeAstreinte : 'Inconnu'; };
  const getClinicienName = (id) => { if (!id || id === 0) return ''; const p = personnels.find(p => p.id === id); return p ? p.Clinicien : 'Inconnu'; };
  const getCliniciensByService = (svcId) => {
    if (!svcId) return [];
    const svc = services.find(s => s.id === parseInt(svcId));
    if (!svc) return [];
    if (svc.Cliniciens && Array.isArray(svc.Cliniciens) && svc.Cliniciens[0] === 'L') {
      const ids = svc.Cliniciens.slice(1);
      return personnels.filter(p => ids.includes(p.id));
    }
    return personnels.filter(p => p.ServiceClinique === svc.ServiceClinique);
  };

  const isJour = (a) => a.Type === '☀️ Jour';
  const isNuit = (a) => a.Type === '🌙 Nuit';
  const getEffectiveClinicien = (a) => a.Clinicien_Modif ? getClinicienName(a.Modif_Clinicien) : getClinicienName(a.Clinicien);

  const getCardStyle = (a) => {
    if (a.ValidationService) return { border: '#10b981', bg: '#d1fae5' };
    if (a.NonRealise) return { border: '#ef4444', bg: '#fee2e2' };
    if (a.Clinicien_Modif) return { border: '#f59e0b', bg: '#fef3c7' };
    return { border: '#3b82f6', bg: isJour(a) ? '#dbeafe' : '#e0f2fe' };
  };

  const handleAstreinteClick = (a) => {
    if (!isResponsable()) return;
    setSelectedAstreinte(a);
    setSuiviFormData({ modifClinicien: a.Modif_Clinicien || '', nonRealise: a.NonRealise || false });
    setShowSuiviModal(true);
  };

  const handleSaveSuivi = async () => {
    if (!selectedAstreinte) return;
    try {
      await gristAPI.updateRecord('Astreintes', selectedAstreinte.id, {
        Modif_Clinicien: suiviFormData.modifClinicien ? parseInt(suiviFormData.modifClinicien) : null,
        NonRealise: suiviFormData.nonRealise
      });
      setShowSuiviModal(false); setSuiviFormData({ modifClinicien: '', nonRealise: false }); setSelectedAstreinte(null);
      await loadData();
    } catch (e) { alert('Erreur: ' + e.message); }
  };

  const isMonthPast = (y, m) => new Date(y, m + 1, 0) < new Date();

  const hasUnvalidated = (y, m) => {
    const scAuto = getUserScNoms();
    return astreintes.some(a => {
      if (a.ValidationService) return false;
      if (scAuto && !scAuto.includes(a.ServiceClinique)) return false;
      if (selectedServiceClinique !== 'tous' && a.ServiceClinique !== selectedServiceClinique) return false;
      const d = new Date(a.Date * 1000);
      return d.getFullYear() === y && d.getMonth() === m;
    });
  };

  const confirmValidateMonth = async () => {
    const { year, month } = monthToValidate;
    const scAuto = getUserScNoms();
    const toValidate = astreintes.filter(a => {
      if (a.ValidationService) return false;
      if (scAuto && !scAuto.includes(a.ServiceClinique)) return false;
      if (selectedServiceClinique !== 'tous' && a.ServiceClinique !== selectedServiceClinique) return false;
      const d = new Date(a.Date * 1000);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    for (const a of toValidate) await gristAPI.updateRecord('Astreintes', a.id, { ValidationService: true });
    setShowConfirmModal(false);
    await loadData();
  };

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
    const scAuto = getUserScNoms();
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        {Array.from({ length: 12 }, (_, m) => {
          const md = new Date(y, m, 1);
          const count = filterBySC(astreintes.filter(a => {
            if (scAuto && !scAuto.includes(a.ServiceClinique)) return false;
            const d = new Date(a.Date * 1000); return d.getFullYear() === y && d.getMonth() === m;
          })).length;
          return (
            <div key={m} onClick={() => { setCurrentDate(md); setViewMode('mois'); }} style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', cursor: 'pointer', textAlign: 'center', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
              <h3 style={{ margin: '0 0 8px 0', color: '#1f2937', textTransform: 'capitalize', fontSize: '15px' }}>{md.toLocaleDateString('fr-FR', { month: 'long' })}</h3>
              <div style={{ fontSize: '22px', color: '#3b82f6', fontWeight: 'bold' }}>{count}</div>
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
    const cur = new Date(start);
    const cells = [];
    for (let w = 0; w < 6; w++) for (let d = 0; d < 7; d++) {
      const day = new Date(cur); const inMonth = day.getMonth() === mo; const isToday = day.toDateString() === new Date().toDateString();
      const dayA = filterBySC(getAstreintesForDate(day));
      cells.push(
        <div key={`${w}-${d}`} onClick={() => inMonth && (setCurrentDate(day), setViewMode('semaine'))} style={{ minHeight: '90px', padding: '6px', border: '1px solid #e5e7eb', background: inMonth ? 'white' : '#f9fafb', cursor: inMonth ? 'pointer' : 'default', opacity: inMonth ? 1 : 0.5 }}>
          <div style={{ fontWeight: isToday ? 'bold' : 'normal', color: isToday ? '#3b82f6' : inMonth ? '#1f2937' : '#9ca3af', marginBottom: '3px', fontSize: '13px' }}>{day.getDate()}</div>
          <div style={{ fontSize: '9px' }}>
            {dayA.slice(0, 3).map((a, i) => { const cs = getCardStyle(a); return <div key={i} style={{ background: cs.bg, border: `1px solid ${cs.border}`, padding: '1px 3px', borderRadius: '3px', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{isJour(a) ? '☀️' : '🌙'} {getServiceName(a.TypeAstreinte).substring(0, 10)}</div>; })}
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
              <div style={{ padding: '12px', background: '#f3f4f6', textAlign: 'center', borderBottom: '1px solid #e5e7eb', fontWeight: isToday ? 'bold' : '500', color: isToday ? '#3b82f6' : '#1f2937' }}>
                <div style={{ fontSize: '11px', marginBottom: '2px' }}>{day.toLocaleDateString('fr-FR', { weekday: 'short' })}</div>
                <div style={{ fontSize: '15px' }}>{day.getDate()}</div>
              </div>
              <div style={{ padding: '10px', minHeight: '280px', background: 'white' }}>
                {dayA.map((a, idx) => { const cs = getCardStyle(a); return (
                  <div key={idx} onClick={() => handleAstreinteClick(a)} style={{ background: cs.bg, padding: '6px 8px', borderRadius: '6px', marginBottom: '6px', fontSize: '11px', cursor: isResponsable() ? 'pointer' : 'default', border: `2px solid ${cs.border}`, opacity: a.ValidationService ? 0.8 : 1 }}>
                    <div style={{ fontWeight: '500', marginBottom: '2px' }}>{isJour(a) ? '☀️' : '🌙'} {getServiceName(a.TypeAstreinte)}{a.ValidationService && <span style={{ color: '#10b981', marginLeft: '4px' }}>✓</span>}</div>
                    <div style={{ color: '#6b7280' }}>{getEffectiveClinicien(a)}{a.Clinicien_Modif && <span style={{ color: '#f59e0b' }}> ↻</span>}</div>
                    {a.NonRealise && <div style={{ color: '#ef4444', fontWeight: '500', fontSize: '10px' }}>✗ Non réalisé</div>}
                  </div>
                ); })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}><div style={{ fontSize: '48px', marginBottom: '20px' }}>📋</div><div>Chargement...</div></div>;

  const viewAstr = getAstreintesView();
  const canValidate = isResponsable() && isMonthPast(currentDate.getFullYear(), currentDate.getMonth()) && hasUnvalidated(currentDate.getFullYear(), currentDate.getMonth());

  return (
    <div style={{ padding: '2px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', padding: '10px', borderRadius: '12px', textAlign: 'center', marginBottom: '10px' }}>
        <h1 style={{ fontSize: '1.5rem', margin: '0 0 4px 0' }}>📋 Suivi des astreintes</h1>
        <p style={{ fontSize: '1rem', margin: 0, opacity: 0.9 }}>Suivi et validation des astreintes réalisées</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={navigatePrevious} style={{ background: '#6b7280', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>←</button>
          <button onClick={goToToday} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}>Aujourd'hui</button>
          <button onClick={navigateNext} style={{ background: '#6b7280', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>→</button>
          <h2 style={{ margin: '0 0 0 10px', color: '#1f2937', textTransform: 'capitalize', fontSize: '16px' }}>{getCurrentViewTitle()}</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {viewMode === 'mois' && (
            <button onClick={() => canValidate && (setMonthToValidate({ year: currentDate.getFullYear(), month: currentDate.getMonth() }), setShowConfirmModal(true))} disabled={!canValidate} style={{ background: canValidate ? '#059669' : '#d1d5db', color: canValidate ? 'white' : '#9ca3af', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: canValidate ? 'pointer' : 'not-allowed', fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>✓ Valider le mois</button>
          )}
          <select value={selectedServiceClinique} onChange={e => setSelectedServiceClinique(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}>
            <option value="tous">Tous les services</option>
            {getServicesCliниquesNoms().map(sc => <option key={sc} value={sc}>{sc}</option>)}
          </select>
          <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: '6px', padding: '2px' }}>
            {['année', 'mois', 'semaine'].map(mode => <button key={mode} onClick={() => setViewMode(mode)} style={{ background: viewMode === mode ? '#10b981' : 'transparent', color: viewMode === mode ? 'white' : '#374151', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', textTransform: 'capitalize' }}>{mode}</button>)}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        {viewMode === 'année' && renderYearView()}
        {viewMode === 'mois' && renderMonthView()}
        {viewMode === 'semaine' && renderWeekView()}
      </div>

      {/* Modal confirmation validation mois */}
      {showConfirmModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', maxWidth: '380px', width: '90%', overflow: 'hidden' }}>
            <div style={{ background: '#059669', color: 'white', padding: '20px', textAlign: 'center' }}><div style={{ fontSize: '40px', marginBottom: '8px' }}>✓</div><h4 style={{ margin: 0 }}>Validation des astreintes</h4></div>
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 16px 0', color: '#374151', lineHeight: 1.5 }}>Confirmer la validation des astreintes{selectedServiceClinique !== 'tous' ? ` de <strong>${selectedServiceClinique}</strong>` : ''} du mois de <strong>{new Date(monthToValidate.year, monthToValidate.month).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</strong> ?</p>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '13px' }}>Cette action est irréversible.</p>
            </div>
            <div style={{ background: '#f9fafb', padding: '16px 24px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowConfirmModal(false)} style={{ background: 'white', color: '#374151', border: '1px solid #d1d5db', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Annuler</button>
              <button onClick={confirmValidateMonth} style={{ background: '#059669', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>✓ Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal suivi astreinte */}
      {showSuiviModal && selectedAstreinte && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '28px', borderRadius: '12px', minWidth: '480px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 18px 0', color: '#1f2937' }}>Suivi — {new Date(selectedAstreinte.Date * 1000).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h3>
            <div style={{ background: '#f9fafb', padding: '14px', borderRadius: '6px', marginBottom: '18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
              <div><span style={{ color: '#6b7280' }}>Service : </span><strong>{getServiceName(selectedAstreinte.TypeAstreinte)}</strong></div>
              <div><span style={{ color: '#6b7280' }}>Type : </span><strong>{isJour(selectedAstreinte) ? '☀️ Jour' : '🌙 Nuit'}</strong></div>
              <div style={{ gridColumn: '1/-1' }}><span style={{ color: '#6b7280' }}>Clinicien prévu : </span><strong>{getClinicienName(selectedAstreinte.Clinicien)}</strong></div>
            </div>
            {!selectedAstreinte.ValidationService ? (
              <>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '14px' }}>Modification du clinicien</label>
                  <select value={suiviFormData.modifClinicien} onChange={e => setSuiviFormData({ ...suiviFormData, modifClinicien: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}>
                    <option value="">Aucun changement</option>
                    {getCliniciensByService(selectedAstreinte.TypeAstreinte).map(c => <option key={c.id} value={c.id}>{c.Clinicien}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input type="checkbox" checked={suiviFormData.nonRealise} onChange={e => setSuiviFormData({ ...suiviFormData, nonRealise: e.target.checked })} style={{ marginRight: '8px' }} />
                    <span style={{ fontWeight: '500' }}>Astreinte non réalisée</span>
                  </label>
                </div>
              </>
            ) : (
              <div style={{ background: '#fef3c7', padding: '12px', borderRadius: '6px', marginBottom: '18px', fontSize: '13px' }}>
                <div style={{ color: '#d97706', fontWeight: '600', marginBottom: '6px' }}>⚠️ Astreinte validée — consultation uniquement</div>
                <div><strong>Clinicien effectif :</strong> {getEffectiveClinicien(selectedAstreinte)}{selectedAstreinte.Clinicien_Modif && <span style={{ color: '#f59e0b' }}> (modifié)</span>}</div>
                {selectedAstreinte.NonRealise && <div style={{ color: '#ef4444', fontWeight: '500', marginTop: '4px' }}>✗ Non réalisée</div>}
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowSuiviModal(false); setSuiviFormData({ modifClinicien: '', nonRealise: false }); setSelectedAstreinte(null); }} style={{ background: '#6b7280', color: 'white', border: 'none', padding: '9px 20px', borderRadius: '6px', cursor: 'pointer' }}>{selectedAstreinte.ValidationService ? 'Fermer' : 'Annuler'}</button>
              {!selectedAstreinte.ValidationService && <button onClick={handleSaveSuivi} style={{ background: '#10b981', color: 'white', border: 'none', padding: '9px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Sauvegarder</button>}
            </div>
          </div>
        </div>
      )}

      {/* Légende */}
      <div style={{ background: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '15px' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#1f2937', fontSize: '14px' }}>Légende</h3>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px' }}>
          {[['#dbeafe','#3b82f6','Non validée'],['#d1fae5','#10b981','Validée'],['#fef3c7','#f59e0b','Clinicien modifié'],['#fee2e2','#ef4444','Non réalisée']].map(([bg,border,label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '14px', height: '14px', background: bg, borderRadius: '3px', border: `2px solid ${border}` }}></div><span>{label}</span></div>
          ))}
        </div>
      </div>

      {/* Statistiques */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        <div style={{ gridColumn: '1/-1', textAlign: 'center' }}><h3 style={{ color: '#1f2937', margin: '0 0 8px 0', fontSize: '15px' }}>Statistiques {getPeriodTitle()}</h3></div>
        {[
          { label: 'Total', value: viewAstr.length, color: '#3b82f6' },
          { label: 'Validées', value: viewAstr.filter(a => a.ValidationService).length, color: '#10b981' },
          { label: 'Cliniciens modifiés', value: viewAstr.filter(a => a.Clinicien_Modif).length, color: '#f59e0b' },
          { label: 'Non réalisées', value: viewAstr.filter(a => a.NonRealise).length, color: '#ef4444' }
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
