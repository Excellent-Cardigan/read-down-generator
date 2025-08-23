import Layout from "./Layout.jsx";

import PatternGenerator from "./PatternGenerator";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    PatternGenerator: PatternGenerator,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<PatternGenerator />} />
                
                
                <Route path="/PatternGenerator" element={<PatternGenerator />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    // eslint-disable-next-line no-undef
    const basename = process.env.NODE_ENV === 'production' ? '/read-down-generator' : '';
    
    return (
        <Router basename={basename}>
            <PagesContent />
        </Router>
    );
}