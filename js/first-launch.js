/* ========================================
   WUUspor — İlk Açılış / Onboarding (first-launch.js)
   3 adımlı rehber + takım seçimi + bildirim izni.
   ======================================== */

const WUUOnboarding = (() => {
  let currentStep = 1;
  const totalSteps = 3;

  const elements = {
    container: document.getElementById('onboarding-steps'),
    step1: document.getElementById('onboarding-step-1'),
    step2: document.getElementById('onboarding-step-2'),
    step3: document.getElementById('onboarding-step-3'),
    teamSelection: document.getElementById('onboarding-team-selection'),
    stepIndicator: document.getElementById('onboarding-step-indicator'),
    btnNext: document.getElementById('onboarding-btn-next'),
    btnSkip: document.getElementById('onboarding-btn-skip'),
    btnFinish: document.getElementById('onboarding-btn-finish'),
    teamCards: document.querySelectorAll('.team-select-card')
  };

  let selectedTeam = null;

  function init() {
    if (!elements.container) return;

    // Buton olayları
    if (elements.btnNext) {
      elements.btnNext.addEventListener('click', () => nextStep());
    }
    if (elements.btnSkip) {
      elements.btnSkip.addEventListener('click', () => finishOnboarding());
    }
    if (elements.btnFinish) {
      elements.btnFinish.addEventListener('click', () => finishOnboarding());
    }

    // Takım kartları
    elements.teamCards.forEach(card => {
      card.addEventListener('click', () => selectTeam(card.dataset.team));
    });
  }

  function nextStep() {
    if (currentStep < totalSteps) {
      currentStep++;
      updateStepUI();
    } else {
      // Son aşamada ise team selection'a geç
      showTeamSelection();
    }
  }

  function updateStepUI() {
    // Tüm adımları gizle
    [elements.step1, elements.step2, elements.step3].forEach(el => {
      if (el) el.classList.add('hidden');
    });

    // Aktif adımı göster
    const activeEl = document.getElementById(`onboarding-step-${currentStep}`);
    if (activeEl) activeEl.classList.remove('hidden');

    // İlerleme göstergesi
    if (elements.stepIndicator) {
      elements.stepIndicator.textContent = `${currentStep} / ${totalSteps}`;
    }

    // Butonları güncelle
    if (elements.btnNext) {
      elements.btnNext.textContent = currentStep === totalSteps ? 'Takım Seç' : 'İleri';
    }
    if (elements.btnSkip) {
      elements.btnSkip.style.display = currentStep === totalSteps ? 'none' : 'inline';
    }
  }

  function showTeamSelection() {
    [elements.step1, elements.step2, elements.step3].forEach(el => {
      if (el) el.classList.add('hidden');
    });
    if (elements.teamSelection) elements.teamSelection.classList.remove('hidden');
    if (elements.btnNext) elements.btnNext.style.display = 'none';
    if (elements.btnSkip) elements.btnSkip.style.display = 'none';
  }

  function selectTeam(teamKey) {
    selectedTeam = teamKey;

    // Görsel seçimi
    elements.teamCards.forEach(card => {
      card.classList.remove('selected');
    });
    const selectedCard = document.querySelector(`.team-select-card[data-team="${teamKey}"]`);
    if (selectedCard) selectedCard.classList.add('selected');

    // Finish butonunu etkinleştir
    if (elements.btnFinish) {
      elements.btnFinish.disabled = false;
      elements.btnFinish.style.opacity = '1';
    }
  }

  function finishOnboarding() {
    if (!selectedTeam) return;

    // Kaydet
    localStorage.setItem('wuuspor_favori', selectedTeam);
    localStorage.setItem('wuuspor_onboarding_seen', 'true');

    // Takım rengini uygula
    WUUApp.applyTeamColor(selectedTeam);

    // Ana ekrana geç
    WUUApp.showScreen('home');

    // Bildirim izni isteme (sadece PWA/standalone modunda)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      requestNotificationPermission();
    }
  }

  function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      setTimeout(() => {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            console.log('Bildirim izni verildi');
          }
        });
      }, 1000);
    }
  }

  return { init };
})();

window.WUUOnboarding = WUUOnboarding;