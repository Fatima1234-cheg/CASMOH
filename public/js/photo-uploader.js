document.addEventListener('DOMContentLoaded', function() {
  const dropZone = document.getElementById('dropZone');
  const input = document.getElementById('photoInput');
  const preview = document.getElementById('photoPreview');

  if (!dropZone || !input || !preview) {
    console.log('Photo elements not found');
    return;
  }

  // Stock les fichiers sélectionnés
  let selectedFiles = [];

  // Fonction pour afficher les miniatures
  function displayThumbnails() {
    preview.innerHTML = '';

    selectedFiles.forEach((file, index) => {
      const reader = new FileReader();

      reader.onload = function(e) {
        // Container pour la miniature + bouton delete
        const container = document.createElement('div');
        container.style.cssText = `
          position: relative;
          display: inline-block;
          margin: 5px;
          flex-shrink: 0;
        `;

        // Image
        const img = document.createElement('img');
        img.src = e.target.result;
        img.style.cssText = `
          width: 90px;
          height: 90px;
          object-fit: cover;
          border-radius: 8px;
          border: 2px solid #e5e7eb;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
          display: block;
          cursor: pointer;
        `;

        // Bouton supprimer (X rouge)
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.innerHTML = '×';
        deleteBtn.style.cssText = `
          position: absolute;
          top: -8px;
          right: -8px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #ef4444;
          color: white;
          border: none;
          font-size: 18px;
          font-weight: bold;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        `;

        deleteBtn.onclick = function(e) {
          e.preventDefault();
          selectedFiles.splice(index, 1);
          syncFileInput();
          displayThumbnails();
        };

        container.appendChild(img);
        container.appendChild(deleteBtn);
        preview.appendChild(container);
      };

      reader.readAsDataURL(file);
    });
  }

  // Sync selectedFiles avec l'input file
  function syncFileInput() {
    try {
      const dataTransfer = new DataTransfer();
      selectedFiles.forEach(file => {
        dataTransfer.items.add(file);
      });
      input.files = dataTransfer.files;
    } catch(err) {
      console.warn('DataTransfer not supported:', err);
    }
  }

  // Ajouter des fichiers
  function addFiles(files) {
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        // Éviter les doublons
        const exists = selectedFiles.find(f => f.name === file.name && f.size === file.size);
        if (!exists) {
          selectedFiles.push(file);
        }
      }
    });

    syncFileInput();
    displayThumbnails();
  }

  // Click sur input file
  input.addEventListener('change', function() {
    addFiles(input.files);
  });

  // Drag & Drop
  dropZone.addEventListener('dragover', function(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.style.backgroundColor = '#f0f5ff';
    dropZone.style.borderColor = '#6366f1';
  });

  dropZone.addEventListener('dragleave', function(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.style.backgroundColor = '#fafafa';
    dropZone.style.borderColor = '#d1d5db';
  });

  dropZone.addEventListener('drop', function(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.style.backgroundColor = '#fafafa';
    dropZone.style.borderColor = '#d1d5db';

    if (e.dataTransfer && e.dataTransfer.files) {
      addFiles(e.dataTransfer.files);
    }
  });

  // Afficher les photos existantes (mode édition)
  if (typeof existingPhotos !== 'undefined' && Array.isArray(existingPhotos) && existingPhotos.length) {
    preview.innerHTML = '';
    existingPhotos.forEach(url => {
      const img = document.createElement('img');
      img.src = url;
      img.style.cssText = `
        width: 90px;
        height: 90px;
        object-fit: cover;
        border-radius: 8px;
        border: 2px solid #e5e7eb;
        display: block;
        margin: 5px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      `;
      preview.appendChild(img);
    });
  }

  console.log('Photo uploader initialized');
});
