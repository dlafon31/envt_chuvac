const Component = () => {
  const [astreintes, setAstreintes] = useState([]);
  const [gestionnaires, setGestionnaires] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [statistics, setStatistics] = useState({
    totalPrevues: 0, totalValidees: 0, totalEligibles: 0,
    totalPayees: 0, aPayerEtat: 0, aPayerEnvt: 0
  });
  const [formData, setFormData] = useState({ budget: '', gestionnaire: '', commentaire: '' });
  const [processing, setProcessing] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => { loadData(); initializeDefaultDate(); }, []);
  useEffect(() => { if (selectedMonth && selectedYear) calculateStatistics(); }, [selectedMonth, selectedYear, astreintes]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [astreintesData, gestionnairesData, utilisateursData] = await Promise.all([
        gristAPI.getData('Astreintes'),
        gristAPI.getData('Gestionnaires'),
        gristAPI.getData('Utilisateurs')
      ]);
      setAstreintes(Array.isArray(astreintesData) ? astreintesData : []);
      setGestionnaires(Array.isArray(gestionnairesData) ? gestionnairesData : []);
      setUtilisateurs(Array.isArray(utilisateursData) ? utilisateursData : []);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      setAstreintes([]); setGestionnaires([]); setUtilisateurs([]);
    } finally { setLoading(false); }
  };

  const initializeDefaultDate = () => {
    const today = new Date();
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    setCurrentDate(currentMonth);
    setSelectedYear(currentMonth.getFullYear().toString());
    setSelectedMonth(String(currentMonth.getMonth() + 1).padStart(2, '0'));
  };

  const navigatePrevious = () => {
    const d = new Date(currentDate); d.setMonth(d.getMonth() - 1); setCurrentDate(d);
    setSelectedYear(d.getFullYear().toString());
    setSelectedMonth(String(d.getMonth() + 1).padStart(2, '0'));
  };
  const navigateNext = () => {
    const d = new Date(currentDate); d.setMonth(d.getMonth() + 1); setCurrentDate(d);
    setSelectedYear(d.getFullYear().toString());
    setSelectedMonth(String(d.getMonth() + 1).padStart(2, '0'));
  };
  const goToToday = () => {
    const today = new Date();
    const d = new Date(today.getFullYear(), today.getMonth(), 1);
    setCurrentDate(d);
    setSelectedYear(d.getFullYear().toString());
    setSelectedMonth(String(d.getMonth() + 1).padStart(2, '0'));
  };

  // Les timestamps Grist Date sont stockés UTC minuit (ex: 2025-03-31T00:00:00Z).
  // En Europe/Paris (UTC+1 ou UTC+2), new Date(ts*1000).getMonth() retournerait
  // le mois PRÉCÉDENT pour le dernier jour du mois (ex: 31 mars = 30 mars 23h).
  // On utilise getUTCFullYear/getUTCMonth pour comparer sans décalage timezone.
  const matchesMonth = (timestamp, yearNumber, monthNumber) => {
    const d = new Date(timestamp * 1000);
    return d.getUTCFullYear() === yearNumber && d.getUTCMonth() === monthNumber;
  };

  const calculateStatistics = () => {
    if (!selectedMonth || !selectedYear || !astreintes.length) {
      setStatistics({ totalPrevues: 0, totalValidees: 0, totalEligibles: 0, totalPayees: 0, aPayerEtat: 0, aPayerEnvt: 0 });
      return;
    }
    const monthNumber = parseInt(selectedMonth) - 1;
    const yearNumber = parseInt(selectedYear);
    const monthAstreintes = astreintes.filter(a => matchesMonth(a.Date, yearNumber, monthNumber));

    setStatistics({
      totalPrevues: monthAstreintes.length,
      totalValidees: monthAstreintes.filter(a => a.ValidationService === true).length,
      totalEligibles: monthAstreintes.filter(a => a.Rem_APayer === true).length,
      totalPayees: monthAstreintes.filter(a => a.Rem_APayer === true && a.Rem_Payee === true).length,
      aPayerEtat: monthAstreintes.filter(a =>
        a.Rem_APayer === true &&
        (a.Rem_Payee === false || a.Rem_Payee === null || a.Rem_Payee === undefined) &&
        (a.Rem_Support === 'ETAT' || a.Rem_Support === 'ÉTAT')
      ).length,
      aPayerEnvt: monthAstreintes.filter(a =>
        a.Rem_APayer === true &&
        (a.Rem_Payee === false || a.Rem_Payee === null || a.Rem_Payee === undefined) &&
        a.Rem_Support === 'ENVT'
      ).length
    });
  };

  const getMonthName = (monthNumber) => {
    const months = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
    return months[parseInt(monthNumber) - 1] || '';
  };

  const getAstreintesToPay = () => {
    if (!selectedMonth || !selectedYear || !formData.budget) return [];
    const monthNumber = parseInt(selectedMonth) - 1;
    const yearNumber = parseInt(selectedYear);
    return astreintes.filter(a => {
      const matchesDate = matchesMonth(a.Date, yearNumber, monthNumber);
      const isEligible = a.Rem_APayer === true;
      const isNotPaid = a.Rem_Payee === false || a.Rem_Payee === null || a.Rem_Payee === undefined;
      const matchesBudget =
        (formData.budget === 'ETAT' && (a.Rem_Support === 'ETAT' || a.Rem_Support === 'ÉTAT')) ||
        (formData.budget === 'ENVT' && a.Rem_Support === 'ENVT');
      return matchesDate && isEligible && isNotPaid && matchesBudget;
    });
  };

  const handleValidatePaiement = async () => {
    if (!formData.budget || !formData.gestionnaire) {
      alert('Veuillez renseigner le budget et le gestionnaire'); return;
    }
    const astreintesToPay = getAstreintesToPay();
    if (astreintesToPay.length === 0) { alert('Aucune astreinte à payer pour ce budget'); return; }
    if (!confirm(`Confirmer la mise en paiement de ${astreintesToPay.length} astreinte${astreintesToPay.length > 1 ? 's' : ''} sur le budget ${formData.budget} ?`)) return;

    setProcessing(true);
    try {
      // Générer un UUID côté JS avant la création pour pouvoir retrouver l'enregistrement
      // de façon fiable ensuite (gristAPI.addRecord dans les widgets ne retourne pas l'id)
      const refEtat = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });

      // Gestionnaire est de type Text dans Astreintes_Etats — envoyer PrenomNom
      const gestionnaireRecord = gestionnaires.find(g => g.id === parseInt(formData.gestionnaire));
      const gestionnairePrenomNom = gestionnaireRecord ? gestionnaireRecord.PrenomNom : '';

      await gristAPI.addRecord('Astreintes_Etats', {
        Nom: `Etat paiement ${getMonthName(selectedMonth)} ${selectedYear} - Budget ${formData.budget}`,
        Date_EtatPaiement: Math.floor(Date.now() / 1000),
        Support: formData.budget,
        Gestionnaire: gestionnairePrenomNom,
        Commentaire: formData.commentaire || '',
        Nbr_Astreintes: astreintesToPay.length,
        Ref: refEtat
      });

      // Retrouver l'état créé via le Ref qu'on a nous-mêmes défini
      const etatsData = await gristAPI.getData('Astreintes_Etats');
      const etatCree = etatsData.find(e => e.Ref === refEtat);
      if (!etatCree) throw new Error("Impossible de retrouver l'état de paiement créé (Ref: " + refEtat + ")");

      for (const a of astreintesToPay) {
        await gristAPI.addRecord('Astreintes_Payees', {
          Ref_Astreinte: a.Ref,
          Ref_Etat: etatCree.Ref,
          PrenomNom: a.Rem_PrenomNom,
          Statut: a.Rem_Statut,
          Support: a.Rem_Support,
          Service: a.Rem_Service,
          Date_Astreinte: a.Date
        });
      }

      alert(`Mise en paiement réussie ! ${astreintesToPay.length} astreinte${astreintesToPay.length > 1 ? 's ont été mises' : ' a été mise'} en paiement.`);
      setFormData({ budget: '', gestionnaire: '', commentaire: '' });
      await loadData();
    } catch (error) {
      console.error('Erreur mise en paiement:', error);
      alert('Erreur lors de la mise en paiement: ' + error.message);
    } finally { setProcessing(false); }
  };

  const isGestionnaire = () => utilisateurs.length > 0 && utilisateurs[0].Gestionnaire === true;

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '30px' }}>
      <div style={{ fontSize: '36px', marginBottom: '15px' }}>💰</div>
      <div>Chargement de la gestion des paiements...</div>
    </div>
  );

  const astreintesToPay = getAstreintesToPay();
  const canSubmit = formData.budget && formData.gestionnaire && !processing && astreintesToPay.length > 0;

  return (
    <div style={{ padding: '2px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* En-tête */}
      <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white', padding: '2px', borderRadius: '12px', textAlign: 'center', marginBottom: '10px' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>💰 Gestion du paiement</h1>
        <p style={{ fontSize: '1rem', margin: '0', opacity: '0.9' }}>Mise en paiement des astreintes</p>
      </div>

      {/* Navigation mois */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 20px 2fr', background: 'white', padding: '10px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div><h2 style={{ margin: '0 0 15px 0', color: '#1f2937', fontSize: '18px' }}>📅 Sélection du mois</h2></div>
        <div></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
          <button onClick={navigatePrevious} style={{ background: '#6b7280', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>←</button>
          <button onClick={goToToday} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Aujourd'hui</button>
          <button onClick={navigateNext} style={{ background: '#6b7280', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>→</button>
          <h3 style={{ margin: '0 0 0 15px', color: '#1f2937', textTransform: 'capitalize', fontSize: '18px' }}>{getMonthName(selectedMonth)} {selectedYear}</h3>
        </div>
      </div>

      {/* Statistiques */}
      {selectedMonth && selectedYear && (
        <div style={{ background: 'white', padding: '10px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h2 style={{ margin: '0 0 15px 0', color: '#1f2937', fontSize: '18px' }}>📊 Etat de situation des astreintes du mois</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
            {[
              { value: statistics.totalPrevues,   label: 'Prévues',       bg: '#f8fafc', border: '#e2e8f0', color: '#3b82f6', lc: '#64748b' },
              { value: statistics.totalValidees,  label: 'Validées',      bg: '#f0fdf4', border: '#bbf7d0', color: '#10b981', lc: '#16a34a' },
              { value: statistics.totalEligibles, label: 'Éligibles',     bg: '#fefce8', border: '#fde047', color: '#eab308', lc: '#ca8a04' },
              { value: statistics.totalPayees,    label: 'Payées',        bg: '#f0f9ff', border: '#7dd3fc', color: '#0284c7', lc: '#0369a1' },
              { value: statistics.aPayerEtat,     label: 'À payer ÉTAT',  bg: '#fef2f2', border: '#fecaca', color: '#dc2626', lc: '#b91c1c' },
              { value: statistics.aPayerEnvt,     label: 'À payer ENVT',  bg: '#f3e8ff', border: '#d8b4fe', color: '#9333ea', lc: '#7c3aed' }
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, padding: '12px', borderRadius: '6px', border: `1px solid ${s.border}`, textAlign: 'center' }}>
                <div style={{ fontSize: '20px', color: s.color, fontWeight: 'bold', marginBottom: '4px' }}>{s.value}</div>
                <div style={{ color: s.lc, fontSize: '11px', fontWeight: '500' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formulaire mise en paiement */}
      {selectedMonth && selectedYear && isGestionnaire() && (
        <div style={{ background: 'white', padding: '10px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 15px 0', color: '#1f2937', fontSize: '18px' }}>💳 Mise en paiement des astreintes</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Budget * <span style={{ color: '#ef4444', marginLeft: '4px' }}>obligatoire</span></label>
              <select value={formData.budget} onChange={e => setFormData({...formData, budget: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', background: 'white' }}>
                <option value="">Sélectionner un budget</option>
                <option value="ENVT">ENVT</option>
                <option value="ETAT">ÉTAT</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Gestionnaire * <span style={{ color: '#ef4444', marginLeft: '4px' }}>obligatoire</span></label>
              <select value={formData.gestionnaire} onChange={e => setFormData({...formData, gestionnaire: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', background: 'white' }}>
                <option value="">Sélectionner un gestionnaire</option>
                {gestionnaires.map(g => <option key={g.id} value={g.id}>{g.PrenomNom}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Commentaire <span style={{ color: '#6b7280', fontWeight: '400' }}>(facultatif)</span></label>
            <textarea value={formData.commentaire} onChange={e => setFormData({...formData, commentaire: e.target.value})} placeholder="Commentaire sur cette mise en paiement..." rows={2} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <button onClick={handleValidatePaiement} disabled={!canSubmit} style={{ background: canSubmit ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : '#d1d5db', color: canSubmit ? 'white' : '#9ca3af', border: 'none', padding: '12px 24px', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: canSubmit ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', minWidth: '200px' }}>
              {processing ? <><span>⏳</span><span>Traitement en cours...</span></> : <><span>💳</span><span>Valider la mise en paiement</span></>}
            </button>
            {(!formData.budget || !formData.gestionnaire) && <div style={{ marginTop: '2px', color: '#ef4444', fontSize: '13px', fontWeight: '500' }}>Veuillez renseigner le budget et le gestionnaire</div>}
            {formData.budget && formData.gestionnaire && astreintesToPay.length === 0 && <div style={{ marginTop: '2px', color: '#ef4444', fontSize: '13px', fontWeight: '500' }}>Aucune astreinte à payer pour ce budget</div>}
          </div>
        </div>
      )}

      {!isGestionnaire() && selectedMonth && selectedYear && (
        <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '10px' }}>🔒</div>
          <div style={{ color: '#92400e', fontSize: '14px', fontWeight: '500' }}>Seuls les gestionnaires peuvent effectuer des mises en paiement</div>
        </div>
      )}
    </div>
  );
};