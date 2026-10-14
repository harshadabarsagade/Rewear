
import { useEffect, useState } from 'react';
import api from './api/api';
import './App.css';

const categories = [
  'Tops',
  'Bottoms',
  'Dresses',
  'Ethnic Wear',
  'Footwear',
  'Accessories',
];

const occasions = [
  'Casual',
  'College',
  'Party',
  'Festive',
  'Formal',
  'Any',
];

const API_SERVER = 'http://localhost:5000';

function imageUrl(image) {
  if (!image) return '';

  if (
    image.startsWith('http://') ||
    image.startsWith('https://') ||
    image.startsWith('data:')
  ) {
    return image;
  }

  return `${API_SERVER}${image.startsWith('/') ? '' : '/'}${image}`;
}

function App() {
  const [clothes, setClothes] = useState([]);
  const [outfits, setOutfits] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Tops');
  const [color, setColor] = useState('');
  const [occasion, setOccasion] = useState('Any');

  const [photo, setPhoto] = useState(null);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imagePreview, setImagePreview] = useState('');

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState([]);
  const [outfitName, setOutfitName] = useState('');

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function loadData() {
    setLoading(true);

    try {
      const [clothesResponse, outfitsResponse] = await Promise.all([
        api.get('/clothes'),
        api.get('/outfits'),
      ]);

      setClothes(clothesResponse.data);
      setOutfits(outfitsResponse.data);
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
        'Could not load data. Check backend and MongoDB.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handlePhotoChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage('Please select an image file.');
      event.target.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage('Photo must be 2 MB or smaller.');
      event.target.value = '';
      return;
    }

    setPhoto(file);
    setImagePreview(URL.createObjectURL(file));
    setImageUrlInput('');
    setMessage('');
  }

  async function getImage() {
    if (photo) {
      const formData = new FormData();
      formData.append('image', photo);

      const response = await api.post('/upload', formData);

      return response.data.image;
    }

    if (imageUrlInput.trim()) {
      try {
        const parsedUrl = new URL(imageUrlInput.trim());

        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          throw new Error('Invalid URL');
        }

        return parsedUrl.href;
      } catch {
        throw new Error('Please enter a valid image URL.');
      }
    }

    throw new Error('Please upload a photo or paste an image link.');
  }

  async function addClothes(event) {
    event.preventDefault();

    if (!name.trim() || !color.trim()) {
      setMessage('Please enter clothing name and color.');
      return;
    }

    if (!photo && !imageUrlInput.trim()) {
      setMessage('Upload a photo or paste an image link.');
      return;
    }

    setBusy(true);

    try {
      const image = await getImage();

      await api.post('/clothes', {
        name: name.trim(),
        category,
        color: color.trim(),
        occasion,
        image,
      });

      setName('');
      setCategory('Tops');
      setColor('');
      setOccasion('Any');
      setPhoto(null);
      setImageUrlInput('');
      setImagePreview('');

      event.target.reset();

      setMessage('Clothing item saved successfully!');
      await loadData();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
        error.message ||
        'Could not add clothing item.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteClothes(id) {
    try {
      await api.delete(`/clothes/${id}`);

      setSelected((previous) =>
        previous.filter((itemId) => itemId !== id)
      );

      setMessage('Clothing item deleted successfully!');
      await loadData();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
        'Could not delete clothing item.'
      );
    }
  }

  function toggleClothes(id) {
    setSelected((previous) =>
      previous.includes(id)
        ? previous.filter((itemId) => itemId !== id)
        : [...previous, id]
    );
  }

  async function saveOutfit(event) {
    event.preventDefault();

    if (!outfitName.trim()) {
      setMessage('Please enter an outfit name.');
      return;
    }

    if (selected.length < 2) {
      setMessage('Select at least two clothing items.');
      return;
    }

    setBusy(true);

    try {
      await api.post('/outfits', {
        name: outfitName.trim(),
        occasion,
        items: selected,
      });

      setOutfitName('');
      setSelected([]);

      setMessage('Outfit saved successfully!');
      await loadData();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
        'Could not save outfit.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteOutfit(id) {
    try {
      await api.delete(`/outfits/${id}`);

      setMessage('Outfit deleted successfully!');
      await loadData();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
        'Could not delete outfit.'
      );
    }
  }

  async function getRecommendations() {
    try {
      const response = await api.get('/recommendations', {
        params: { occasion },
      });

      setRecommendations(response.data);

      if (response.data.length === 0) {
        setMessage(
          'No matching outfits yet. Add more clothes with matching colors.'
        );
      } else {
        setMessage(`${response.data.length} outfit suggestions found.`);
      }
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
        'Could not load recommendations.'
      );
    }
  }

  const filteredClothes = clothes.filter((item) => {
    const matchesCategory =
      filter === 'All' || item.category === filter;

    const matchesSearch = item.name
      .toLowerCase()
      .includes(search.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="app">
      <header className="navbar">
        <a className="logo" href="#home">
          ReWear<span>.</span>
        </a>

        <nav>
          <a href="#home">Home</a>
          <a href="#add-clothes">Add Clothes</a>
          <a href="#wardrobe">My Wardrobe</a>
          <a href="#outfits">My Outfits</a>
          <a href="#recommendations">Recommendations</a>
        </nav>

        <a className="nav-button" href="#add-clothes">
          + Add Item
        </a>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-content">
            <p className="eyebrow">YOUR STYLE, ORGANIZED</p>

            <h1>
              Your wardrobe.
              <br />
              Your personal style.
            </h1>

            <p className="hero-description">
              Organize your clothes, create new combinations and
              rediscover outfits with what you already own.
            </p>

            <a className="primary-button" href="#wardrobe">
              Explore My Wardrobe
            </a>
          </div>

          <div className="hero-note">
            <span>01</span>
            <div>
              <strong>Wear what you own.</strong>
              <p>More outfits, less shopping.</p>
            </div>
          </div>
        </section>

        <section className="add-section" id="add-clothes">
          <p className="eyebrow">START YOUR COLLECTION</p>
          <h2>Add a clothing item</h2>

          <p className="section-description">
            Upload a photo or paste an image link.
          </p>

          <form className="clothes-form" onSubmit={addClothes}>
            <div className="form-field">
              <label htmlFor="clothes-name">Clothing name</label>
              <input
                id="clothes-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Pink Kurti"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="clothes-category">Category</label>
              <select
                id="clothes-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="clothes-color">Color</label>
              <input
                id="clothes-color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                placeholder="e.g. Pink, Black, White"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="clothes-occasion">Occasion</label>
              <select
                id="clothes-occasion"
                value={occasion}
                onChange={(event) => setOccasion(event.target.value)}
              >
                {occasions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="clothes-image">Upload a photo</label>
              <input
                id="clothes-image"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
              />
              <small>Maximum photo size: 2 MB.</small>
            </div>

            <div className="form-field">
              <label htmlFor="image-url">
                Or paste an image link
              </label>

              <input
                id="image-url"
                type="url"
                placeholder="https://example.com/photo.jpg"
                value={imageUrlInput}
                onChange={(event) => {
                  setImageUrlInput(event.target.value);
                  setPhoto(null);
                  setImagePreview('');

                  const fileInput =
                    document.getElementById('clothes-image');

                  if (fileInput) fileInput.value = '';
                }}
              />
            </div>

            {(imagePreview || imageUrlInput) && (
              <div className="preview">
                <img
                  src={imagePreview || imageUrlInput}
                  alt="Clothing preview"
                />

                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setPhoto(null);
                    setImageUrlInput('');
                    setImagePreview('');

                    const fileInput =
                      document.getElementById('clothes-image');

                    if (fileInput) fileInput.value = '';
                  }}
                >
                  Remove photo
                </button>
              </div>
            )}

            <button
              className="primary-button submit-button"
              type="submit"
              disabled={busy}
            >
              {busy ? 'Saving...' : 'Save to Wardrobe'}
            </button>
          </form>
        </section>

        <section className="wardrobe-section" id="wardrobe">
          <div className="wardrobe-heading">
            <div>
              <p className="eyebrow">YOUR COLLECTION</p>

              <h2>
                My Wardrobe{' '}
                <span className="count">{clothes.length}</span>
              </h2>

              <p className="section-description">
                Select items to create an outfit.
              </p>
            </div>

            <input
              className="search-input"
              type="search"
              placeholder="Search clothes..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search clothes"
            />
          </div>

          <div className="category-filters">
            {['All', ...categories].map((item) => (
              <button
                key={item}
                type="button"
                className={
                  filter === item
                    ? 'filter-button active'
                    : 'filter-button'
                }
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="empty-state">
              <h3>Loading your wardrobe...</h3>
            </div>
          ) : filteredClothes.length === 0 ? (
            <div className="empty-state">
              <h3>
                {clothes.length
                  ? 'No clothes found'
                  : 'Your wardrobe is waiting'}
              </h3>

              <p>
                {clothes.length
                  ? 'Try another search or category.'
                  : 'Add your first clothing item above.'}
              </p>
            </div>
          ) : (
            <div className="clothes-grid">
              {filteredClothes.map((item) => (
                <article className="clothes-card" key={item._id}>
                  <div className="clothes-image">
                    <img
                      src={imageUrl(item.image)}
                      alt={item.name}
                    />
                    <span className="item-category">
                      {item.category}
                    </span>
                  </div>

                  <div className="clothes-info">
                    <div>
                      <h3>{item.name}</h3>
                      <p>
                        {item.color} · {item.occasion || 'Any'}
                      </p>

                      <label className="select-item">
                        <input
                          type="checkbox"
                          checked={selected.includes(item._id)}
                          onChange={() => toggleClothes(item._id)}
                        />
                        Add to outfit
                      </label>
                    </div>

                    <button
                      type="button"
                      className="delete-button"
                      onClick={() => deleteClothes(item._id)}
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="outfit-section" id="outfits">
          <p className="eyebrow">MIX, MATCH AND REUSE</p>
          <h2>Create an outfit</h2>

          <p className="section-description">
            Select at least two items in My Wardrobe, then name your outfit.
          </p>

          <form className="outfit-form" onSubmit={saveOutfit}>
            <div className="form-field">
              <label htmlFor="outfit-name">Outfit name</label>
              <input
                id="outfit-name"
                placeholder="e.g. College Look"
                value={outfitName}
                onChange={(event) => setOutfitName(event.target.value)}
                required
              />
            </div>

            <p className="selected-count">
              {selected.length} item(s) selected
            </p>

            <button
              type="submit"
              className="primary-button"
              disabled={busy || selected.length < 2}
            >
              {busy ? 'Saving...' : 'Save My Outfit'}
            </button>
          </form>

          {outfits.length === 0 ? (
            <div className="empty-state outfit-empty">
              <h3>No saved outfits yet</h3>
              <p>Your saved combinations will appear here.</p>
            </div>
          ) : (
            <div className="outfit-grid">
              {outfits.map((outfit) => (
                <article className="outfit-card" key={outfit._id}>
                  <div className="outfit-images">
                    {(outfit.items || []).filter(Boolean).map((item) => (
                      <img
                        key={item._id}
                        src={imageUrl(item.image)}
                        alt={item.name}
                        title={item.name}
                      />
                    ))}
                  </div>

                  <div className="outfit-card-info">
                    <h3>{outfit.name}</h3>

                    <p>
                      {(outfit.items || [])
                        .filter(Boolean)
                        .map((item) => item.name)
                        .join(' + ')}
                    </p>

                    <button
                      type="button"
                      className="delete-button"
                      onClick={() => deleteOutfit(outfit._id)}
                    >
                      Delete outfit
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="outfit-section" id="recommendations">
          <p className="eyebrow">FIND YOUR NEXT LOOK</p>
          <h2>Outfit recommendations</h2>

          <p className="section-description">
            Get suggestions based on clothing colors and occasion.
          </p>

          <div className="form-field">
            <label htmlFor="recommendation-occasion">
              Choose an occasion
            </label>

            <select
              id="recommendation-occasion"
              value={occasion}
              onChange={(event) => setOccasion(event.target.value)}
            >
              {occasions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={getRecommendations}
          >
            Suggest outfits
          </button>

          {recommendations.length === 0 ? (
            <div className="empty-state">
              <h3>No suggestions loaded yet</h3>
              <p>
                Add clothes and click Suggest outfits to see combinations.
              </p>
            </div>
          ) : (
            <div className="outfit-grid">
              {recommendations.map((outfit, index) => (
                <article
                  className="outfit-card"
                  key={`${outfit.name}-${index}`}
                >
                  <div className="outfit-images">
                    {(outfit.items || []).map((item) => (
                      <img
                        key={item._id}
                        src={imageUrl(item.image)}
                        alt={item.name}
                      />
                    ))}
                  </div>

                  <div className="outfit-card-info">
                    <h3>{outfit.name}</h3>
                    <p>{outfit.reason}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <a className="logo" href="#home">
          ReWear<span>.</span>
        </a>
        <p>A little more style, a little less waste.</p>
      </footer>

      {message && (
        <div className="toast" role="status">
          <span>{message}</span>

          <button
            type="button"
            onClick={() => setMessage('')}
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
